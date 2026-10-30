// Hayat MCP server — Model Context Protocol over Streamable HTTP (stateless JSON responses).
// Auth: "Authorization: Bearer hyt_..." personal token created in the app (Ayarlar > MCP).
// Only the SHA-256 hash of the token is stored in the database.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MODULES = ['fitness', 'kitchen', 'faith', 'growth', 'ideas', 'planner', 'trackers', 'goals', 'notes'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
};

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

type Ctx = { userId: string; scopes: string[]; db: SupabaseClient; tz: string };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function authenticate(req: Request): Promise<Ctx | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!/^hyt_[0-9a-f]{64}$/.test(token)) return null;
  const { data } = await admin
    .from('api_tokens')
    .select('id,user_id,scopes,revoked_at')
    .eq('token_hash', await sha256(token))
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  admin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});
  const { data: profile } = await admin.from('profiles').select('settings').eq('id', data.user_id).maybeSingle();
  return { userId: data.user_id, scopes: data.scopes, db: admin, tz: profile?.settings?.timezone ?? 'Europe/Istanbul' };
}

function todayIn(tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const str = (d = '') => ({ type: 'string', description: d });
const num = (d = '') => ({ type: 'number', description: d });

const itemFields = {
  module: { type: 'string', enum: MODULES },
  kind: str('ör. task, recipe, shopping, book, movie, series, idea, verse, goal, workout_program, note'),
  title: str(),
  body: str('Serbest metin / not'),
  data: { type: 'object', description: 'Türe özel ek alanlar' },
  tags: { type: 'array', items: { type: 'string' } },
  status: str('ör. todo, done, wishlist, in_progress, completed'),
  rating: num('0-10'),
  favorite: { type: 'boolean' },
  due_at: str('ISO 8601 tarih/saat'),
  remind_at: str('ISO 8601 tarih/saat'),
};

const TOOLS = [
  {
    name: 'get_today_summary',
    description: 'Bugünün özeti: su/protein/sayfa ilerlemesi, bugünkü görevler, aktif spor günü, yaklaşan önemli günler.',
    inputSchema: { type: 'object', properties: {} },
    scope: 'read',
  },
  {
    name: 'list_items',
    description: 'Modül/tür/durum filtresiyle kayıtları listeler.',
    inputSchema: {
      type: 'object',
      properties: { module: itemFields.module, kind: str(), status: str(), favorite: { type: 'boolean' }, limit: num('varsayılan 50') },
    },
    scope: 'read',
  },
  {
    name: 'search_items',
    description: 'Başlık ve metinde arama yapar.',
    inputSchema: { type: 'object', properties: { query: str(), module: itemFields.module, limit: num() }, required: ['query'] },
    scope: 'read',
  },
  {
    name: 'get_item',
    description: 'Tek bir kaydı ve alt kayıtlarını getirir.',
    inputSchema: { type: 'object', properties: { id: str() }, required: ['id'] },
    scope: 'read',
  },
  {
    name: 'create_item',
    description: 'Yeni kayıt oluşturur (görev, tarif, alışveriş maddesi, kitap, fikir, ayet...).',
    inputSchema: { type: 'object', properties: itemFields, required: ['module', 'kind', 'title'] },
    scope: 'write',
  },
  {
    name: 'update_item',
    description: 'Var olan kaydı günceller (sadece verilen alanlar).',
    inputSchema: { type: 'object', properties: { id: str(), ...itemFields }, required: ['id'] },
    scope: 'write',
  },
  {
    name: 'complete_task',
    description: 'Görevi veya alışveriş maddesini tamamlandı olarak işaretler.',
    inputSchema: { type: 'object', properties: { id: str(), done: { type: 'boolean' } }, required: ['id'] },
    scope: 'write',
  },
  {
    name: 'add_log',
    description: 'Takip kaydı ekler: water (ml), protein (g), pages (sayfa), saving (₺, item_id=hedef).',
    inputSchema: {
      type: 'object',
      properties: {
        kind: str('water | protein | pages | saving | set'),
        amount: num(),
        unit: str(),
        item_id: str(),
        day: str('YYYY-MM-DD'),
        data: { type: 'object' },
      },
      required: ['kind', 'amount'],
    },
    scope: 'write',
  },
  {
    name: 'list_logs',
    description: 'Belirli türdeki takip kayıtlarını tarih aralığında getirir.',
    inputSchema: { type: 'object', properties: { kind: str(), from: str('YYYY-MM-DD'), to: str('YYYY-MM-DD'), item_id: str() }, required: ['kind'] },
    scope: 'read',
  },
  {
    name: 'list_alerts',
    description: 'Yaklaşan önemli günler, bayramlar, indirim dönemleri ve haberler.',
    inputSchema: { type: 'object', properties: { days: num('kaç gün ilerisi, varsayılan 30') } },
    scope: 'read',
  },
];

const ITEM_KEYS = ['module', 'kind', 'title', 'body', 'data', 'tags', 'status', 'rating', 'favorite', 'due_at', 'remind_at'];
function pickItem(a: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of ITEM_KEYS) if (a[k] !== undefined) out[k] = a[k];
  if (out.module && !MODULES.includes(String(out.module))) throw new Error('Geçersiz modül');
  if (typeof out.title === 'string' && out.title.length > 500) throw new Error('Başlık çok uzun');
  return out;
}

async function callTool(ctx: Ctx, name: string, a: Record<string, any>) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Bilinmeyen araç: ${name}`);
  if (!ctx.scopes.includes(tool.scope)) throw new Error(`Bu token "${tool.scope}" yetkisine sahip değil`);
  const { db, userId } = ctx;
  const limit = Math.min(Number(a.limit) || 50, 200);

  switch (name) {
    case 'get_today_summary': {
      const day = todayIn(ctx.tz);
      const [{ data: profile }, { data: logs }, { data: tasks }, { data: program }, { data: alerts }] = await Promise.all([
        db.from('profiles').select('settings').eq('id', userId).single(),
        db.from('logs').select('kind,amount').eq('user_id', userId).eq('day', day).in('kind', ['water', 'protein', 'pages']),
        db
          .from('items')
          .select('id,title,due_at,status')
          .eq('user_id', userId)
          .eq('kind', 'task')
          .is('completed_at', null)
          .lte('due_at', `${day}T23:59:59Z`)
          .order('due_at'),
        db.from('items').select('title,data').eq('user_id', userId).eq('kind', 'workout_program').eq('status', 'active').maybeSingle(),
        db.from('alerts').select('title,kind,starts_on').or(`user_id.is.null,user_id.eq.${userId}`).gte('starts_on', day).order('starts_on').limit(5),
      ]);
      const s = profile?.settings ?? {};
      const sum = (k: string) => (logs ?? []).filter((l) => l.kind === k).reduce((t, l) => t + Number(l.amount), 0);
      const days = program?.data?.days ?? [];
      const current = days[program?.data?.current_day ?? 0];
      return {
        day,
        water: { ml: sum('water'), goal: s.water_goal ?? 2500 },
        protein: { g: sum('protein'), goal: s.protein_goal ?? 120 },
        pages: { read: sum('pages'), goal: s.pages_goal ?? 20 },
        tasks: tasks ?? [],
        workout: program ? { program: program.title, today: current?.name, exercises: current?.exercises ?? [] } : null,
        upcoming: alerts ?? [],
      };
    }
    case 'list_items': {
      let q = db
        .from('items')
        .select('id,module,kind,title,status,rating,favorite,tags,due_at,completed_at,data,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (a.module) q = q.eq('module', a.module);
      if (a.kind) q = q.eq('kind', a.kind);
      if (a.status) q = q.eq('status', a.status);
      if (a.favorite !== undefined) q = q.eq('favorite', !!a.favorite);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case 'search_items': {
      const term = String(a.query)
        .replace(/[%,()]/g, ' ')
        .slice(0, 100);
      let q = db
        .from('items')
        .select('id,module,kind,title,body,status,tags,created_at')
        .eq('user_id', userId)
        .or(`title.ilike.%${term}%,body.ilike.%${term}%`)
        .limit(limit);
      if (a.module) q = q.eq('module', a.module);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case 'get_item': {
      const { data, error } = await db.from('items').select('*').eq('user_id', userId).eq('id', a.id).single();
      if (error) throw error;
      const { data: children } = await db.from('items').select('id,kind,title,status,completed_at').eq('parent_id', a.id).eq('user_id', userId);
      return { ...data, children };
    }
    case 'create_item': {
      const { data, error } = await db
        .from('items')
        .insert({ ...pickItem(a), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    case 'update_item': {
      const patch = pickItem(a);
      const { data, error } = await db.from('items').update(patch).eq('user_id', userId).eq('id', a.id).select().single();
      if (error) throw error;
      return data;
    }
    case 'complete_task': {
      const done = a.done !== false;
      const { data, error } = await db
        .from('items')
        .update({ completed_at: done ? new Date().toISOString() : null, status: done ? 'done' : 'todo' })
        .eq('user_id', userId)
        .eq('id', a.id)
        .select('id,title,status')
        .single();
      if (error) throw error;
      return data;
    }
    case 'add_log': {
      const row = {
        user_id: userId,
        kind: String(a.kind).slice(0, 40),
        amount: Number(a.amount),
        unit: a.unit ?? null,
        item_id: a.item_id ?? null,
        data: a.data ?? {},
        day: a.day ?? todayIn(ctx.tz),
      };
      if (!Number.isFinite(row.amount)) throw new Error('amount sayı olmalı');
      const { data, error } = await db.from('logs').insert(row).select().single();
      if (error) throw error;
      return data;
    }
    case 'list_logs': {
      let q = db
        .from('logs')
        .select('id,kind,amount,unit,day,data,item_id,logged_at')
        .eq('user_id', userId)
        .eq('kind', a.kind)
        .order('logged_at', { ascending: false })
        .limit(500);
      if (a.from) q = q.gte('day', a.from);
      if (a.to) q = q.lte('day', a.to);
      if (a.item_id) q = q.eq('item_id', a.item_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case 'list_alerts': {
      const from = todayIn(ctx.tz);
      const to = new Date(Date.now() + (Number(a.days) || 30) * 86400000).toISOString().slice(0, 10);
      const { data, error } = await db
        .from('alerts')
        .select('kind,title,body,url,starts_on,ends_on,importance')
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .gte('starts_on', from)
        .lte('starts_on', to)
        .order('starts_on');
      if (error) throw error;
      return data;
    }
  }
}

type RpcReq = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };

async function handle(ctx: Ctx, msg: RpcReq) {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
  switch (msg.method) {
    case 'initialize': {
      const requested = msg.params?.protocolVersion;
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'hayat', title: 'Hayat — kişisel asistan', version: '1.0.0' },
        instructions:
          'Kullanıcının kişisel notları, görevleri, spor programı, tarifleri, kitap/film listesi, fikirleri, hedefleri ve günlük takipleri. Tarihleri ISO formatında kullan.',
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS.filter((t) => ctx.scopes.includes(t.scope)).map(({ scope: _s, ...t }) => t) });
    case 'tools/call': {
      try {
        const result = await callTool(ctx, msg.params?.name, msg.params?.arguments ?? {});
        return ok({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: { result } });
      } catch (e) {
        return ok({ content: [{ type: 'text', text: `Hata: ${(e as Error).message}` }], isError: true });
      }
    }
    default:
      if (msg.method?.startsWith('notifications/')) return null;
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...cors, Allow: 'POST' } });
  }
  const ctx = await authenticate(req);
  if (!ctx) {
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
      { status: 401, headers: { ...cors, 'WWW-Authenticate': 'Bearer' } },
    );
  }
  let body: RpcReq | RpcReq[];
  try {
    body = await req.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: cors });
  }
  const batch = Array.isArray(body) ? body : [body];
  const results = (await Promise.all(batch.map((m) => handle(ctx, m)))).filter(Boolean);
  if (results.length === 0) return new Response(null, { status: 202, headers: cors });
  return Response.json(Array.isArray(body) ? results : results[0], { headers: cors });
});
