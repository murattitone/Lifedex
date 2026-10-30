// Fills the global "Önemli" feed: official holidays, Islamic days (Umm al-Qura calendar),
// shopping/special days, and daily news headlines (optionally ranked & summarised by Gemini free tier).
// Runs daily via pg_cron; app users may also trigger it (throttled).
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
// First feed that returns headlines wins; override with NEWS_RSS (comma-separated).
const NEWS_FEEDS = (
  Deno.env.get('NEWS_RSS') ??
  'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr,https://feeds.bbci.co.uk/turkce/rss.xml,https://www.trthaber.com/manset_articles.rss'
).split(',');
const THROTTLE_HOURS = 6;

type Alert = {
  source_key: string;
  kind: 'holiday' | 'religious' | 'shopping' | 'special' | 'news';
  title: string;
  body?: string | null;
  url?: string | null;
  starts_on: string;
  ends_on?: string | null;
  importance: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

function nthWeekday(y: number, m: number, weekday: number, n: number) {
  const first = utc(y, m, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return utc(y, m, 1 + offset + (n - 1) * 7);
}

function fixedEvents(years: number[]): Alert[] {
  const out: Alert[] = [];
  for (const y of years) {
    const add = (key: string, kind: Alert['kind'], title: string, d: Date, importance = 2, body?: string, end?: Date) =>
      out.push({ source_key: `${kind}:${key}:${y}`, kind, title, starts_on: iso(d), ends_on: end ? iso(end) : null, importance, body: body ?? null });

    add('yilbasi', 'holiday', 'Yılbaşı', utc(y, 1, 1), 2, 'Resmi tatil');
    add('23nisan', 'holiday', 'Ulusal Egemenlik ve Çocuk Bayramı', utc(y, 4, 23), 2, 'Resmi tatil');
    add('1mayis', 'holiday', 'Emek ve Dayanışma Günü', utc(y, 5, 1), 2, 'Resmi tatil');
    add('19mayis', 'holiday', "Atatürk'ü Anma, Gençlik ve Spor Bayramı", utc(y, 5, 19), 2, 'Resmi tatil');
    add('15temmuz', 'holiday', 'Demokrasi ve Millî Birlik Günü', utc(y, 7, 15), 2, 'Resmi tatil');
    add('30agustos', 'holiday', 'Zafer Bayramı', utc(y, 8, 30), 2, 'Resmi tatil');
    add('29ekim', 'holiday', 'Cumhuriyet Bayramı', utc(y, 10, 29), 3, 'Resmi tatil (28 Ekim öğleden sonra yarım gün)');

    add('sevgililer', 'special', 'Sevgililer Günü', utc(y, 2, 14), 2);
    add('kadinlar', 'special', 'Dünya Kadınlar Günü', utc(y, 3, 8), 1);
    add('anneler', 'special', 'Anneler Günü', nthWeekday(y, 5, 0, 2), 3, 'Mayıs ayının 2. pazarı');
    add('babalar', 'special', 'Babalar Günü', nthWeekday(y, 6, 0, 3), 3, 'Haziran ayının 3. pazarı');
    add('ogretmenler', 'special', 'Öğretmenler Günü', utc(y, 11, 24), 1);

    const thanksgiving = nthWeekday(y, 11, 4, 4);
    const blackFriday = addDays(thanksgiving, 1);
    add('efsane-kasim', 'shopping', 'Efsane Kasım indirimleri başlıyor', utc(y, 11, 1), 2, 'Kasım boyunca kampanyalar', utc(y, 11, 30));
    add('1111', 'shopping', '11.11 Bekarlar Günü indirimleri', utc(y, 11, 11), 2);
    add('black-friday', 'shopping', 'Black Friday / Efsane Cuma', blackFriday, 3, 'Yılın en büyük indirim günü', addDays(blackFriday, 3));
    add('cyber-monday', 'shopping', 'Cyber Monday', addDays(blackFriday, 3), 2);
    add('yilbasi-alisveris', 'shopping', 'Yılbaşı indirimleri', utc(y, 12, 15), 1, undefined, utc(y, 12, 31));
    add('ocak-sezon', 'shopping', 'Kış sezonu sonu indirimleri', utc(y, 1, 2), 1, undefined, utc(y, 1, 31));
    add('temmuz-sezon', 'shopping', 'Yaz sezonu sonu indirimleri', utc(y, 7, 1), 1, undefined, utc(y, 7, 31));
  }
  return out;
}

// Islamic calendar via ICU (Umm al-Qura). Diyanet dates may differ by ±1 day.
function islamicEvents(from: Date, days: number): Alert[] {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
  const map = new Map<string, Date>(); // "y-m-d" hijri -> gregorian
  const list: { h: { y: number; m: number; d: number }; g: Date }[] = [];
  for (let i = -40; i < days + 40; i++) {
    const g = addDays(from, i);
    const parts = Object.fromEntries(fmt.formatToParts(g).map((p) => [p.type, p.value]));
    const h = { y: parseInt(parts.year), m: parseInt(parts.month), d: parseInt(parts.day) };
    map.set(`${h.y}-${h.m}-${h.d}`, g);
    list.push({ h, g });
  }
  const out: Alert[] = [];
  const hy = new Set(list.map((x) => x.h.y));
  const at = (y: number, m: number, d: number) => map.get(`${y}-${m}-${d}`);
  for (const y of hy) {
    const push = (key: string, title: string, d: Date | undefined, importance: number, body?: string, end?: Date) => {
      if (!d) return;
      out.push({
        source_key: `religious:${key}:${y}`,
        kind: 'religious',
        title,
        starts_on: iso(d),
        ends_on: end ? iso(end) : null,
        importance,
        body: body ?? null,
      });
    };
    push('hicri-yilbasi', 'Hicri Yılbaşı', at(y, 1, 1), 1);
    push('asure', 'Aşure Günü', at(y, 1, 10), 1);
    const m12 = at(y, 3, 12);
    if (m12) push('mevlid', 'Mevlid Kandili', addDays(m12, -1), 2, 'Kandil gecesi');
    // Regaip: Thursday night before the first Friday of Rajab
    const rajab1 = at(y, 7, 1);
    if (rajab1) {
      const firstFriday = addDays(rajab1, (5 - rajab1.getUTCDay() + 7) % 7);
      push('regaip', 'Regaip Kandili', addDays(firstFriday, -1), 2, 'Kandil gecesi');
    }
    push('mirac', 'Miraç Kandili', at(y, 7, 26), 2, 'Kandil gecesi');
    push('berat', 'Berat Kandili', at(y, 8, 14), 2, 'Kandil gecesi');
    const ramadan1 = at(y, 9, 1);
    if (ramadan1) push('ramazan', 'Ramazan başlıyor', ramadan1, 3, 'İlk sahur bir önceki gece', undefined);
    push('kadir', 'Kadir Gecesi', at(y, 9, 26), 3);
    const shawwal1 = at(y, 10, 1);
    if (shawwal1) {
      push('ramazan-arife', 'Ramazan Bayramı Arifesi', addDays(shawwal1, -1), 2, 'Yarım gün tatil');
      push('ramazan-bayrami', 'Ramazan Bayramı', shawwal1, 3, '3 gün resmi tatil', addDays(shawwal1, 2));
    }
    const dh10 = at(y, 12, 10);
    if (dh10) {
      push('kurban-arife', 'Kurban Bayramı Arifesi', addDays(dh10, -1), 2, 'Yarım gün tatil');
      push('kurban-bayrami', 'Kurban Bayramı', dh10, 3, '4 gün resmi tatil', addDays(dh10, 3));
    }
  }
  return out;
}

async function sha1(s: string) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b))
    .slice(0, 8)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function newsAlerts(today: string): Promise<Alert[]> {
  let xml = '';
  for (const feed of NEWS_FEEDS) {
    try {
      const res = await fetch(feed.trim(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HayatApp/1.0)', Accept: 'application/rss+xml, application/xml' },
      });
      const text = res.ok ? await res.text() : '';
      if (text.includes('<item')) {
        xml = text;
        break;
      }
      console.warn('feed empty', feed, res.status);
    } catch (e) {
      console.warn('feed failed', feed, String(e));
    }
  }
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)]
    .slice(0, 25)
    .map((m) => ({
      title: decode(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      url: decode(m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''),
    }))
    .filter((i) => i.title);
  if (!items.length) return [];

  let picked: { title: string; summary?: string; importance: number; url: string }[] = [];
  if (GEMINI_KEY) {
    try {
      const prompt =
        `Aşağıdaki Türkiye gündem başlıklarından, bir bireyin kaçırmaması gereken EN ÖNEMLİ en fazla 3 gelişmeyi seç ` +
        `(ekonomi, resmi tatil/karar, afet, büyük dünya olayı gibi; magazin ve spor hariç). JSON dizi döndür: ` +
        `[{"i": başlık_indeksi, "title": "kısa başlık", "summary": "1-2 cümle Türkçe özet", "importance": 1-3}]\n\n` +
        items.map((it, i) => `${i}. ${it.title}`).join('\n');
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
      const arr = JSON.parse(text) as { i: number; title: string; summary: string; importance: number }[];
      picked = arr
        .filter((x) => items[x.i])
        .slice(0, 3)
        .map((x) => ({
          title: x.title || items[x.i].title,
          summary: x.summary,
          importance: Math.max(1, Math.min(3, x.importance || 2)),
          url: items[x.i].url,
        }));
    } catch (e) {
      console.error('gemini failed', e);
    }
  }
  if (!picked.length) picked = items.slice(0, 5).map((i) => ({ title: i.title, importance: 1, url: i.url }));

  return Promise.all(
    picked.map(async (p) => ({
      source_key: `news:${today}:${await sha1(p.url || p.title)}`,
      kind: 'news' as const,
      title: p.title,
      body: p.summary ?? null,
      url: p.url,
      starts_on: today,
      importance: p.importance,
    })),
  );
}

Deno.serve(async () => {
  const { data: state } = await admin.from('sync_state').select('ran_at').eq('key', 'alerts').maybeSingle();
  if (state && Date.now() - new Date(state.ran_at).getTime() < THROTTLE_HOURS * 3600000) {
    return Response.json({ skipped: true, ran_at: state.ran_at });
  }
  await admin.from('sync_state').upsert({ key: 'alerts', ran_at: new Date().toISOString() });

  const now = new Date();
  const today = iso(now);
  const y = now.getUTCFullYear();
  const rows: Alert[] = [...fixedEvents([y, y + 1]), ...islamicEvents(utc(y, now.getUTCMonth() + 1, 1), 450)];
  let news: Alert[] = [];
  try {
    news = await newsAlerts(today);
  } catch (e) {
    console.error('news failed', e);
  }
  const all = [...rows, ...news].map((r) => ({ ...r, user_id: null }));
  const { error } = await admin.from('alerts').upsert(all, { onConflict: 'source_key' });
  await admin
    .from('alerts')
    .delete()
    .is('user_id', null)
    .eq('kind', 'news')
    .lt('starts_on', iso(addDays(now, -14)));
  await admin
    .from('sync_state')
    .upsert({ key: 'alerts', ran_at: new Date().toISOString(), info: { count: all.length, news: news.length, error: error?.message } });
  return Response.json({ ok: !error, count: all.length, news: news.length, error: error?.message });
});
