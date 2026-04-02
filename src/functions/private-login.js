/**
 * @file private-login.js
 * @description Server function handling authentication for password-protected private pages.
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    let slug = url.searchParams.get('slug');

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { password } = body;
        slug = slug || body?.slug || null;

        if (password === env.INVESTOR_PASSWORD) {
          if (!slug) {
            return new Response('Missing slug', { status: 400 });
          }

          const protectedContent = await fetchProtectedContent(context, slug);

          const response = new Response(protectedContent, {
            headers: { 'Content-Type': 'text/html' },
          });

          const editorKey = env.EDITOR_KEY;
          response.headers.set('Set-Cookie',  `adminAuth=${editorKey}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`);
          response.headers.append('Set-Cookie', 'authenticated=true; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/');
          return response;
        } else {
          return new Response('Invalid password', { status: 401 });
        }
      } catch (error) {
        console.error('Error processing POST request:', error);
        return new Response('Error processing request', { status: 500 });
      }
    }

    if (request.method === 'GET') {
      if (!slug) {
        return new Response('Missing slug', { status: 400 });
      }

      const cookies = parseCookies(request.headers.get('Cookie') || '');
      const hasValidAdminAuth = Boolean(cookies.adminAuth) && cookies.adminAuth === env.EDITOR_KEY;
      const hasLegacyAuth = cookies.authenticated === 'true';
      if (hasValidAdminAuth || hasLegacyAuth) {
        try {
          const protectedContent = await fetchProtectedContent(context, slug);
          return new Response(protectedContent, {
            headers: { 'Content-Type': 'text/html' },
          });
        } catch (error) {
          console.error('Error processing GET request:', error);
          return new Response('Error fetching content', { status: 500 });
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  function parseCookies(cookieHeader) {
    return Object.fromEntries(
      cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter((part) => part.includes('='))
        .map((part) => {
          const [key, ...value] = part.split('=');
          return [key, value.join('=')];
        })
    );
  }

  async function fetchProtectedContent(context, slug) {
    const { env } = context;
    const siteUrl = env.SITE_URL;

    try {
      const response = await context.env.ASSETS.fetch(`${siteUrl}/private/${slug}/`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let content = await response.text();

      // Extract content from <main> tag if present
      if (content.includes('<main')) {
        const match = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (match && match[1]) {
          content = match[1].trim();
        } else {
          console.warn('Found <main> tag but couldn\'t extract content');
        }
      } else {
        console.warn('No <main> tag found in the content');
      }

      return content;
    } catch (error) {
      console.error('Error fetching or processing content:', error);
      throw error;
    }
  }
