// Reader mode for news alerts: fetches the article behind a news alert, extracts readable text and caches it.
// Only URLs stored in our own alerts table can be fetched (no arbitrary URL proxying).
import { Readability } from 'npm:@mozilla/readability@0.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseHTML } from 'npm:linkedom@0.18.5';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

type Block = { type: 'p' | 'h' | 'quote' | 'li'; text: string };
type Article = { title: string; byline: string | null; site: string | null; image: string | null; url: string; blocks: Block[]; fetched_at: string };

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

function isPrivateHost(host: string) {
  return (
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/.test(host) ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  );
}

async function fetchHtml(url: string) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const u = new URL(current);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('unsupported protocol');
    if (isPrivateHost(u.hostname)) throw new Error('blocked host');
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifedexReader/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr,en;q=0.8',
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`source responded ${res.status}`);
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > 3_000_000) throw new Error('page too large');
    return { html: (await res.text()).slice(0, 3_000_000), finalUrl: current };
  }
  throw new Error('too many redirects');
}

function extract(html: string, url: string): Article {
  const { document } = parseHTML(html);
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const image = meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]');
  const site = meta('meta[property="og:site_name"]');
  const parsed = new Readability(document as unknown as Document).parse();
  const blocks: Block[] = [];
  if (parsed?.content) {
    const { document: body } = parseHTML(`<!doctype html><html><body>${parsed.content}</body></html>`);
    for (const el of body.querySelectorAll('p, h2, h3, h4, blockquote, li')) {
      const text = clean(el.textContent ?? '');
      if (text.length < 2) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'p' && el.closest('blockquote, li')) continue;
      blocks.push({ type: tag === 'blockquote' ? 'quote' : tag === 'li' ? 'li' : tag.startsWith('h') ? 'h' : 'p', text });
      if (blocks.length >= 120) break;
    }
  }
  // Drop bylines, photo credits and reading-time chips that precede the article body.
  const firstBody = blocks.findIndex((b) => b.type === 'p' && b.text.length >= 80);
  const body = (firstBody > 0 ? blocks.slice(firstBody) : blocks).filter(
    (b) => !/^(Kaynak|Fotoğraf|Görsel|Image source|Getty Images)[,:]/i.test(b.text),
  );
  const siteName = site ?? parsed?.siteName ?? new URL(url).hostname.replace(/^www\./, '');
  let title = clean(parsed?.title ?? meta('meta[property="og:title"]') ?? '');
  for (const sep of [' - ', ' | ', ' — '])
    if (siteName && title.endsWith(`${sep}${siteName}`)) title = title.slice(0, -(sep.length + siteName.length));
  return {
    title,
    byline: parsed?.byline ? clean(parsed.byline) : null,
    site: siteName,
    image: image ? new URL(image, url).toString() : null,
    url,
    blocks: body,
    fetched_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    // verify_jwt is on; additionally make sure the caller is a signed-in user
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: user } = await admin.auth.getUser(token);
    if (!user?.user) return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors });

    const { id } = await req.json();
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'invalid id' }, { status: 400, headers: cors });
    const { data: alert } = await admin.from('alerts').select('id,url,kind,title,body,article,user_id').eq('id', id).maybeSingle();
    if (!alert || (alert.user_id && alert.user_id !== user.user.id) || !alert.url) {
      return Response.json({ error: 'not found' }, { status: 404, headers: cors });
    }
    if (alert.article?.blocks?.length) return Response.json(alert.article, { headers: cors });

    const { html, finalUrl } = await fetchHtml(alert.url);
    const article = extract(html, finalUrl);
    if (!article.title) article.title = alert.title;
    if (article.blocks.length) await admin.from('alerts').update({ article }).eq('id', alert.id);
    return Response.json(article, { headers: cors });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502, headers: cors });
  }
});
