import { rateLimit } from '../src/lib/rateLimit';

interface Env {
  INSTAGRAM_PROXY_URL?: string;
  INSTAGRAM_API_URL?: string;
  INSTAGRAM_API_KEY?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=300',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeUsername(value: string | null) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function normalizeInstagramData(items: any[]) {
  return items.map((item) => ({
    id: item?.id,
    caption: item?.caption || '',
    media_type: item?.media_type || item?.mediaType || '',
    media_url: item?.media_url || item?.mediaUrl || '',
    thumbnail_url: item?.thumbnail_url || item?.thumbnailUrl || '',
    permalink: item?.permalink || item?.link || '',
    username: item?.username || item?.userName || item?.owner?.username || '',
    timestamp: item?.timestamp || '',
  }));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const limited = rateLimit(request, 60, 60 * 1000);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const username = normalizeUsername(url.searchParams.get('username'));

    if (!username) {
      return jsonResponse({ error: 'Missing required query parameter: username' }, 400);
    }

    const requestedLimit = Number.parseInt(url.searchParams.get('limit') || '12', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 12;

    const proxyBase = env.INSTAGRAM_PROXY_URL || env.INSTAGRAM_API_URL;
    if (proxyBase) {
      const proxyUrl = new URL(proxyBase);
      proxyUrl.searchParams.set('username', username);
      proxyUrl.searchParams.set('limit', String(limit));

      const headers: Record<string, string> = {};
      if (env.INSTAGRAM_API_KEY) {
        headers['Authorization'] = `Bearer ${env.INSTAGRAM_API_KEY}`;
        headers['x-api-key'] = env.INSTAGRAM_API_KEY;
      }

      const proxyResponse = await fetch(proxyUrl.toString(), { headers });
      if (!proxyResponse.ok) {
        const details = await proxyResponse.text();
        return jsonResponse({ error: 'Instagram upstream request failed', status: proxyResponse.status, details: details.slice(0, 500) }, 502);
      }

      const payload = await proxyResponse.json() as any;
      const rawItems = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      const data = normalizeInstagramData(rawItems)
        .filter((item) => item.media_url)
        .filter((item) => !item.username || normalizeUsername(item.username) === username)
        .slice(0, limit);

      return jsonResponse({ data });
    }

    if (env.INSTAGRAM_ACCESS_TOKEN) {
      const graphUrl = new URL('https://graph.instagram.com/me/media');
      graphUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username');
      graphUrl.searchParams.set('limit', String(limit));
      graphUrl.searchParams.set('access_token', env.INSTAGRAM_ACCESS_TOKEN);

      const graphResponse = await fetch(graphUrl.toString());
      if (!graphResponse.ok) {
        const details = await graphResponse.text();
        return jsonResponse({ error: 'Instagram Graph request failed', status: graphResponse.status, details: details.slice(0, 500) }, 502);
      }

      const graphPayload = await graphResponse.json() as any;
      const rawItems = Array.isArray(graphPayload?.data) ? graphPayload.data : [];
      const data = normalizeInstagramData(rawItems)
        .filter((item) => item.media_url)
        .filter((item) => !item.username || normalizeUsername(item.username) === username)
        .slice(0, limit);

      return jsonResponse({ data });
    }

    return jsonResponse({ error: 'Instagram is not configured. Set INSTAGRAM_PROXY_URL (or INSTAGRAM_API_URL), or INSTAGRAM_ACCESS_TOKEN in Cloudflare environment variables.' }, 500);
  } catch (error: any) {
    return jsonResponse({ error: 'Unexpected error while loading Instagram feed', details: error?.message || 'Unknown error' }, 500);
  }
};
