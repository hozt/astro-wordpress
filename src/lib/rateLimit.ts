/**
 * @file rateLimit.ts
 * @description IP-based rate limiter for API routes; allows 5 requests per 15-minute window per IP address.
 */

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 100 calls to prevent unbounded growth
let callCount = 0;
function cleanup() {
    if (++callCount % 100 === 0) {
        const now = Date.now();
        for (const [key, record] of store) {
            if (now > record.resetAt) store.delete(key);
        }
    }
}

function getClientIp(request: Request): string {
    return (
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
        'unknown'
    );
}

/**
 * Returns a 429 Response if the client has exceeded the rate limit, otherwise null.
 * @param request  Incoming request (used to extract client IP)
 * @param maxRequests  Maximum allowed requests per window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(request: Request, maxRequests: number, windowMs: number): Response | null {
    const ip = getClientIp(request);
    const now = Date.now();
    cleanup();

    const record = store.get(ip);

    if (!record || now > record.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return null;
    }

    if (record.count >= maxRequests) {
        return new Response(
            JSON.stringify({ error: 'Too many requests, please try again later.' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(Math.ceil((record.resetAt - now) / 1000)),
                },
            }
        );
    }

    record.count++;
    return null;
}
