/**
 * @file api/contact.ts
 * @description Server-side contact form handler: validates Turnstile CAPTCHA, enforces rate limiting, and sends email via Mailjet.
 */
import type { APIRoute } from 'astro';
import { env as runtimeEnv } from 'cloudflare:workers';
import { rateLimit } from '../../lib/rateLimit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const limited = rateLimit(request, 5, 15 * 60 * 1000);
    if (limited) return limited;

    let isLocalhost = false;
    try {
        const env = runtimeEnv as any;
        const formData = await request.formData();
        const referer = request.headers.get('Referer') || 'none';
        const hostname = new URL(request.url).hostname;
        isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        const bypassTurnstile =
            (env.TURNSTILE_BYPASS_LOCALHOST === 'true' || env.TURNSTILE_BYPASS_LOCALHOST === '1') &&
            isLocalhost;
        const bypassMailjet =
            (env.MAILJET_BYPASS_LOCALHOST === 'true' || env.MAILJET_BYPASS_LOCALHOST === '1') &&
            isLocalhost;

        const formDataJson: Record<string, any> = {};
        formData.forEach((value, key) => {
            formDataJson[key] = value;
        });

        const replyTo = formDataJson.email || env.MAILJET_TO_EMAIL;
        const turnstileToken = formData.get('cf-turnstile-response');

        if (!turnstileToken && !bypassTurnstile) {
            console.error('Turnstile token is null or undefined');
            return new Response(
                JSON.stringify({ error: 'Turnstile token is missing' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        if (!bypassTurnstile && !env.TURNSTILE_SECRET_KEY) {
            console.error('TURNSTILE_SECRET_KEY is not configured');
            return new Response(
                JSON.stringify({ error: 'Turnstile is not configured' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        if (bypassMailjet) {
            if (referer === 'none') {
                return new Response(
                    JSON.stringify({ success: true, message: 'Message received (Mailjet bypassed on localhost)' }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            } else {
                const successReferer = referer.replace('/contact/', '/success/contact/');
                return new Response(null, {
                    status: 302,
                    headers: { 'Location': successReferer }
                });
            }
        }

        const isTurnstileValid = bypassTurnstile
            ? true
            : await validateTurnstileToken(
                turnstileToken as string,
                env.TURNSTILE_SECRET_KEY
            );

        if (!isTurnstileValid) {
            console.log('Invalid Turnstile token');
            return new Response(
                JSON.stringify({ error: 'Invalid Turnstile token' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const mailjetApiKey = env.MAILJET_API_KEY;
        const mailjetApiSecret = env.MAILJET_API_SECRET;
        const fromEmail = 'cloud@hozt.com';
        const toEmail = env.MAILJET_TO_EMAIL;
        const emailSubject = formDataJson.email_subject || 'New Contact Form Submission';

        let emailText = '\n';
        let emailHtml = '<br>';

        for (const [key, value] of formData.entries()) {
            if (key !== 'cf-turnstile-response') {
                emailText += `${key}: ${value}\n`;
                emailHtml += `<p>${escapeHtml(key)}: ${escapeHtml(String(value))}</p>`;
            }
        }

        const emailData = {
            Messages: [
                {
                    From: {
                        Email: fromEmail,
                        Name: 'Contact Form',
                    },
                    To: [
                        {
                            Email: toEmail,
                            Name: 'Recipient',
                        },
                    ],
                    ReplyTo: {
                        Email: replyTo
                    },
                    Subject: emailSubject,
                    TextPart: emailText,
                    HTMLPart: emailHtml,
                },
            ],
        };

        if (!mailjetApiKey || !mailjetApiSecret || !toEmail) {
            console.error('Mailjet is not configured (missing MAILJET_API_KEY/MAILJET_API_SECRET/MAILJET_TO_EMAIL)');
            return new Response(
                JSON.stringify({ success: false, error: 'Email delivery is not configured' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const emailResponse = await sendEmail(mailjetApiKey, mailjetApiSecret, emailData);

        if (emailResponse.ok) {
            if (referer === 'none') {
                return new Response(
                    JSON.stringify({ success: true, message: 'Message received' }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            } else {
                console.log('referer', referer);
                const successReferer = referer.replace('/contact/', '/success/contact/');
                return new Response(null, {
                    status: 302,
                    headers: { 'Location': successReferer }
                });
            }
        } else {
            const errorText = await emailResponse.text();
            console.error('Email sending failed:', errorText);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Failed to send message',
                    ...(isLocalhost ? { detail: errorText } : {})
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } catch (error) {
        console.error('Error in POST handler:', error);
        const detail =
            error instanceof Error
                ? (error.stack || error.message)
                : String(error);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Internal server error',
                ...(isLocalhost ? { detail } : {})
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function sendEmail(apiKey: string, apiSecret: string, emailData: any) {
    try {
        const response = await fetch('https://api.mailjet.com/v3.1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
            },
            body: JSON.stringify(emailData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error sending email:', errorText);
        }

        return response;
    } catch (error) {
        console.error('Error in sendEmail:', error);
        throw error;
    }
}

async function validateTurnstileToken(token: string, secretKey: string) {
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: secretKey,
                response: token,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error validating Turnstile token:', errorText);
            return false;
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error in validateTurnstileToken:', error);
        return false;
    }
}
