// Run: npm run build:web && node tests/e2e.cjs   (needs Playwright + Chromium installed)
// End-to-end UI test against the static web build with a stateful in-memory Supabase mock.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../dist');
const BASE = 'http://localhost:4174';
const OUT = process.argv[2] || path.resolve(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const csp = fs.readFileSync(DIST + '/_headers', 'utf8').match(/Content-Security-Policy: (.*)/)[1];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const srv = http
  .createServer((req, res) => {
    let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = DIST + '/index.html';
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Content-Security-Policy': csp });
    fs.createReadStream(p).pipe(res);
  })
  .listen(4174);

// ---------- mock database ----------
const uid = '11111111-1111-1111-1111-111111111111';
let seq = 0;
const newId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const nowIso = () => new Date().toISOString();
const dk = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ex = (i, name, sets, reps, weight) => ({ id: `ex${i}`, name, sets, reps, weight });
const DB = {
  profiles: [{ id: uid, display_name: 'Murat', settings: {} }],
  items: [],
  logs: [],
  api_tokens: [],
  alerts: [
    { id: newId(), user_id: null, source_key: 'n1', kind: 'news', title: 'Test haberi başlığı', body: 'Kısa özet.', url: 'https://www.bbc.com/turkce/articles/x', starts_on: dk(new Date()), ends_on: null, importance: 2 },
    { id: newId(), user_id: null, source_key: 'h1', kind: 'shopping', title: 'Efsane Kasım indirimleri başlıyor', body: null, url: null, starts_on: '2026-11-01', ends_on: '2026-11-30', importance: 2 },
  ],
};
const itemDefaults = () => ({ user_id: uid, body: null, data: {}, tags: [], status: null, rating: null, favorite: false, pinned: false, due_at: null, remind_at: null, completed_at: null, parent_id: null, position: 0, created_at: nowIso(), updated_at: nowIso() });
DB.items.push({
  ...itemDefaults(),
  id: newId(),
  module: 'fitness',
  kind: 'workout_program',
  title: 'Programım',
  status: 'active',
  data: { current_day: 0, days: [{ id: 'd1', name: 'Push', exercises: [ex(1, 'Bench Press', 3, '8-10', 60)] }, { id: 'd2', name: 'Pull', exercises: [ex(2, 'Barbell Row', 3, '8-10', 50)] }, { id: 'd3', name: 'Legs', exercises: [ex(3, 'Squat', 3, '6-8', 80)] }] },
});
const programId = DB.items[0].id;

function applyFilters(rows, url) {
  const q = new URL(url).searchParams;
  let out = rows;
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'or', 'columns', 'on_conflict'].includes(k)) continue;
    const dot = v.indexOf('.');
    const op = v.slice(0, dot);
    const val = v.slice(dot + 1);
    const get = (r) => r[k];
    if (op === 'eq') out = out.filter((r) => String(get(r)) === val);
    else if (op === 'neq') out = out.filter((r) => String(get(r)) !== val);
    else if (op === 'in') {
      const set = val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, ''));
      out = out.filter((r) => set.includes(String(get(r))));
    } else if (op === 'is' && val === 'null') out = out.filter((r) => get(r) === null || get(r) === undefined);
    else if (op === 'not' && val === 'is.null') out = out.filter((r) => get(r) !== null && get(r) !== undefined);
    else if (op === 'gte') out = out.filter((r) => get(r) !== null && String(get(r)) >= val);
    else if (op === 'lte') out = out.filter((r) => get(r) !== null && String(get(r)) <= val);
  }
  const order = q.get('order');
  if (order) {
    const [col, dir] = order.split(',')[0].split('.');
    out = [...out].sort((a, b) => ((a[col] ?? '') < (b[col] ?? '') ? -1 : (a[col] ?? '') > (b[col] ?? '') ? 1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  return out;
}

const calls = [];
async function handle(route) {
  const req = route.request();
  const url = req.url();
  const method = req.method();
  const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const u = new URL(url);
  calls.push(`${method} ${u.pathname}`);

  if (u.pathname.startsWith('/functions/v1/article')) {
    return json({ title: 'Test haberi başlığı', byline: null, site: 'BBC News Türkçe', image: null, url: 'https://www.bbc.com/turkce/articles/x', blocks: [{ type: 'p', text: 'Birinci paragraf: haberin gövdesi uygulama içinde okunuyor.' }, { type: 'h', text: 'Ara başlık' }, { type: 'p', text: 'İkinci paragraf.' }] });
  }
  if (u.pathname.startsWith('/functions/v1/')) return json({});
  if (u.pathname.startsWith('/rest/v1/rpc/create_api_token')) return json('hyt_' + 'a'.repeat(64));
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)/);
  if (!m) return json({});
  const table = DB[m[1]];
  if (!table) return json([]);

  if (method === 'GET') {
    const rows = applyFilters(table, url);
    return json(single ? (rows[0] ?? null) : rows, single && !rows[0] ? 406 : 200);
  }
  if (method === 'POST') {
    const body = JSON.parse(req.postData() || '{}');
    const arr = (Array.isArray(body) ? body : [body]).map((b) => {
      const row = m[1] === 'items' ? { ...itemDefaults(), ...b, id: newId() } : m[1] === 'logs' ? { id: newId(), item_id: null, unit: null, data: {}, day: dk(new Date()), logged_at: nowIso(), ...b } : { id: newId(), ...b };
      table.push(row);
      return row;
    });
    return json(single ? arr[0] : arr, 201);
  }
  if (method === 'PATCH') {
    const body = JSON.parse(req.postData() || '{}');
    const rows = applyFilters(table, url);
    rows.forEach((r) => Object.assign(r, body, m[1] === 'items' ? { updated_at: nowIso() } : {}));
    return json(single ? rows[0] : rows);
  }
  if (method === 'DELETE') {
    const rows = applyFilters(table, url);
    for (const r of rows) table.splice(table.indexOf(r), 1);
    return json(single ? rows[0] : rows);
  }
  return json({});
}

// ---------- test runner ----------
const results = [];
const errors = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, String(e.message).split('\n')[0].slice(0, 220)]);
    try {
      await page.screenshot({ path: `${OUT}/FAIL-${name.replace(/[^a-z0-9]+/gi, '_')}.png` });
    } catch {}
  }
}
const assert = (c, msg) => {
  if (!c) throw new Error(msg);
};
let page;
const pathname = () => new URL(page.url()).pathname;
const wait = (ms = 600) => page.waitForTimeout(ms);
const click = async (locator) => {
  await locator.first().click();
  await wait();
};
const back = async () => click(page.getByLabel('Geri'));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', geolocation: { latitude: 41.0082, longitude: 28.9784 }, permissions: ['geolocation'] });
  const session = { access_token: 'x.eyJzdWIiOiIxIn0.x', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 36000, user: { id: uid, email: 'murat@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: nowIso() } };
  await ctx.route('https://pcddakllvoebaaswsspu.supabase.co/**', handle);
  await ctx.addInitScript((s) => localStorage.setItem('sb-pcddakllvoebaaswsspu-auth-token', JSON.stringify(s)), session);
  page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${pathname()}: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console ${pathname()}: ${m.text().slice(0, 200)}`));

  await page.goto(BASE + '/');
  await wait(2000);

  await step('Ana sayfa yükleniyor', async () => {
    assert(await page.getByText('Defter').first().isVisible(), 'Defter bölümü yok');
  });

  await step('Defter: +250 su kaydı', async () => {
    await click(page.getByLabel(/Su \+250/));
    assert(DB.logs.some((l) => l.kind === 'water' && Number(l.amount) === 250), 'su logu eklenmedi');
    assert(await page.getByText('250 / 2,5 L').first().isVisible().catch(() => false) || (await page.getByText(/^250/).count()) > 0, 'UI güncellenmedi');
  });

  // Every index row opens a screen with a working back button
  for (const [label, expect] of [
    ['Spor', '/fitness'],
    ['Mutfak', '/kitchen'],
    ['İbadet', '/faith'],
    ['Gelişim', '/growth'],
    ['Fikirler', '/ideas'],
    ['Hedefler', '/goals'],
    ['Planlayıcı', '/plan'],
    ['Notlar', '/notes'],
  ]) {
    await step(`Dizin → ${label} → Geri`, async () => {
      await page.goto(BASE + '/');
      await wait(1200);
      await click(page.getByText(label, { exact: true }));
      assert(pathname() === expect, `açılan yol ${pathname()}`);
      if (expect === '/plan') return; // tab, no back control
      await back();
      assert(pathname() === '/', `geri sonrası ${pathname()}`);
    });
  }

  await step('Doğrudan bağlantıyla açılan sayfada Geri ana sayfaya döner', async () => {
    await page.goto(BASE + '/goals');
    await wait(1500);
    await back();
    assert(pathname() === '/', `geri sonrası ${pathname()}`);
  });

  await step('Takip → hedef ayarı (sayfadan çıkmadan)', async () => {
    await page.goto(BASE + '/');
    await wait(1200);
    await click(page.getByText('Ayrıntı'));
    assert(pathname() === '/trackers', pathname());
    await click(page.getByLabel('Hedefleri düzenle'));
    const water = page.getByLabel('Su (ml)').or(page.locator('input').nth(0));
    await page.locator('input').first().fill('3000');
    await click(page.getByText('Hedefleri kaydet'));
    assert(DB.profiles[0].settings.water_goal === 3000, 'su hedefi kaydedilmedi: ' + JSON.stringify(DB.profiles[0].settings));
    assert(pathname() === '/trackers', 'sayfa değişti ' + pathname());
    await back();
    assert(pathname() === '/', 'geri ' + pathname());
  });

  // ---- Fitness: switch days ----
  await step('Spor: Gün 2 seç ve sıradaki gün yap', async () => {
    await page.goto(BASE + '/fitness');
    await wait(1500);
    await click(page.getByRole('tab', { name: /Gün 2/ }));
    assert(await page.getByText('Pull', { exact: true }).first().isVisible(), 'Pull gösterilmiyor');
    await page.screenshot({ path: `${OUT}/fitness-day2.png` });
    await click(page.getByText('Sıradaki gün olarak ayarla'));
    const p = DB.items.find((i) => i.id === programId);
    assert(p.data.current_day === 1, 'current_day ' + p.data.current_day);
  });

  await step('Spor: Gün 3 görüntüle → o günü başlat', async () => {
    await click(page.getByRole('tab', { name: /Gün 3/ }));
    await click(page.getByText('Antrenmanı başlat'));
    assert(pathname() === '/fitness/workout', pathname());
    assert(new URL(page.url()).searchParams.get('day') === '2', 'day param ' + page.url());
    await page.locator('text=Squat >> visible=true').first().waitFor({ timeout: 5000 });
  });

  await step('Antrenman: set kaydet, bitir → sıradaki gün ilerler', async () => {
    await click(page.getByLabel('Seti kaydet'));
    assert(DB.logs.some((l) => l.kind === 'set' && l.data.exercise === 'Squat'), 'set logu yok');
    await click(page.getByText('Antrenmanı bitir'));
    const p = DB.items.find((i) => i.id === programId);
    assert(p.data.current_day === 0, 'Legs (gün 3) sonrası gün 1 beklenirdi, current_day=' + p.data.current_day);
    assert(p.data.last_done === dk(new Date()), 'last_done yok');
    assert(pathname() === '/fitness', 'bitir sonrası ' + pathname());
  });

  // ---- Planner ----
  await step('Plan: hızlı görev ekle, tamamla, düzenle, sil', async () => {
    await page.goto(BASE + '/plan');
    await wait(1500);
    await page.getByPlaceholder('Hızlı görev ekle…').fill('E2E görevi');
    await page.getByPlaceholder('Hızlı görev ekle…').press('Enter');
    await wait(800);
    const t = DB.items.find((i) => i.title === 'E2E görevi');
    assert(t, 'görev oluşmadı');
    await click(page.getByText('E2E görevi'));
    assert(pathname().startsWith('/item/'), 'editöre gitmedi ' + pathname());
    await page.getByPlaceholder('Ne yapılacak?').fill('E2E görevi düzenlendi');
    await click(page.getByText('Kaydet', { exact: true }));
    assert(DB.items.find((i) => i.id === t.id).title === 'E2E görevi düzenlendi', 'başlık güncellenmedi');
    assert(pathname() === '/plan', 'kaydet sonrası ' + pathname());
    await click(page.getByRole('checkbox').first());
    assert(DB.items.find((i) => i.id === t.id).completed_at, 'tamamlanmadı');
    await click(page.getByText('E2E görevi düzenlendi'));
    await click(page.getByLabel('Sil'));
    assert(!DB.items.find((i) => i.id === t.id), 'silinmedi');
  });

  await step('Görev: tarih + hatırlatma → remind_at hesaplanır', async () => {
    await page.goto(BASE + '/item/new?kind=task');
    await wait(1500);
    await page.getByPlaceholder('Ne yapılacak?').fill('Hatırlatmalı görev');
    await click(page.getByText('Tarih seç'));
    await click(page.getByText('18:00', { exact: true }));
    await click(page.getByText('Tamam', { exact: true }));
    await click(page.getByText('10 dk önce'));
    await click(page.getByText('Kaydet', { exact: true }));
    const t = DB.items.find((i) => i.title === 'Hatırlatmalı görev');
    assert(t && t.due_at && t.remind_at, 'tarih/hatırlatma yok ' + JSON.stringify(t));
    assert(new Date(t.due_at) - new Date(t.remind_at) === 10 * 60000, 'fark 10 dk değil');
  });

  // ---- Kitchen ----
  await step('Mutfak: ürün ekle, al, temizle', async () => {
    await page.goto(BASE + '/kitchen');
    await wait(1500);
    await page.getByPlaceholder('Ürün ekle (ör. 2 kg domates)').fill('Domates');
    await page.getByPlaceholder('Ürün ekle (ör. 2 kg domates)').press('Enter');
    await wait(800);
    assert(DB.items.some((i) => i.kind === 'shopping' && i.title === 'Domates'), 'ürün eklenmedi');
    await click(page.getByRole('checkbox').first());
    assert(DB.items.find((i) => i.title === 'Domates').completed_at, 'alınmadı');
    await click(page.getByText('Temizle'));
    await wait(800);
    assert(!DB.items.some((i) => i.title === 'Domates'), 'temizlenmedi');
  });

  await step('Mutfak: tarif oluştur → malzemeleri listeye ekle', async () => {
    await page.goto(BASE + '/item/new?kind=recipe');
    await wait(1500);
    await page.locator('input').first().fill('Mercimek çorbası');
    for (const ing of ['Mercimek', 'Soğan']) {
      await page.getByPlaceholder('Malzeme ekle').fill(ing);
      await click(page.getByLabel('Ekle'));
    }
    await click(page.getByText('Kaydet', { exact: true }));
    const r = DB.items.find((i) => i.kind === 'recipe');
    assert(r && r.data.ingredients?.length === 2, 'tarif/malzeme ' + JSON.stringify(r?.data));
    await page.goto(BASE + '/kitchen');
    await wait(1200);
    await click(page.getByText('Tarifler', { exact: true }));
    await click(page.getByText('Malzemeleri listeye ekle'));
    await wait(800);
    assert(DB.items.filter((i) => i.kind === 'shopping' && i.data.recipe_id === r.id).length === 2, 'malzemeler listeye eklenmedi');
  });

  // ---- Growth ----
  await step('Gelişim: kitap ekle (okunuyor, puan)', async () => {
    await page.goto(BASE + '/item/new?kind=book');
    await wait(1500);
    await page.locator('input').first().fill('Atomik Alışkanlıklar');
    await click(page.getByText('Okunuyor', { exact: true }));
    await click(page.getByText('Kaydet', { exact: true }));
    const bk = DB.items.find((i) => i.kind === 'book');
    assert(bk && bk.status === 'in_progress', 'kitap durumu ' + bk?.status);
  });

  // ---- Goals ----
  await step('Hedef: oluştur, birikim ekle, tasarruf kalemi', async () => {
    await page.goto(BASE + '/item/new?kind=goal');
    await wait(1500);
    await page.getByPlaceholder('ör. Yeni bilgisayar').fill('Tatil');
    await page.getByLabel('Hedef tutar').fill('20000').catch(async () => page.locator('input').nth(1).fill('20000'));
    await click(page.getByText('Kaydet', { exact: true }));
    const g = DB.items.find((i) => i.kind === 'goal');
    assert(g, 'hedef yok');
    await page.goto(BASE + '/goals/' + g.id);
    await wait(1500);
    await click(page.getByText('Biriktir', { exact: true }));
    await page.locator('input').first().fill('1500');
    await click(page.getByText('Kaydet', { exact: true }));
    assert(DB.logs.some((l) => l.kind === 'saving' && Number(l.amount) === 1500 && l.item_id === g.id), 'birikim logu yok');
    await click(page.getByText('Ekle', { exact: true }));
    await page.getByPlaceholder('ör. Dışarıda kahve').fill('Kahve');
    await page.locator('input').nth(1).fill('900');
    await click(page.getByText('Kaydet', { exact: true }));
    assert(DB.items.find((i) => i.id === g.id).data.cuts?.length === 1, 'kalem eklenmedi');
  });

  // ---- Quick add ----
  await step('Hızlı ekle → Not editörü → Geri', async () => {
    await page.goto(BASE + '/');
    await wait(1200);
    await click(page.getByLabel('Hızlı ekle'));
    await click(page.getByText('Not', { exact: true }));
    await wait(500);
    assert(pathname().startsWith('/item/new'), pathname());
    await back();
    assert(pathname() === '/', 'geri ' + pathname());
  });

  // ---- News reader ----
  await step('Önemli → haber uygulama içinde açılır → Geri', async () => {
    await page.goto(BASE + '/alerts');
    await wait(1500);
    await click(page.getByText('Test haberi başlığı'));
    assert(pathname().startsWith('/news/'), 'okuyucuya gitmedi ' + pathname());
    await wait(800);
    assert(await page.getByText(/Birinci paragraf/).first().isVisible(), 'haber metni görünmüyor');
    await page.screenshot({ path: `${OUT}/news.png` });
    await back();
    assert(pathname() === '/alerts', 'geri ' + pathname());
  });

  await step('Ana sayfa gündem → haber okuyucu', async () => {
    await page.goto(BASE + '/');
    await wait(1500);
    await click(page.getByText('Test haberi başlığı'));
    assert(pathname().startsWith('/news/'), pathname());
    await back();
    assert(pathname() === '/', pathname());
  });

  // ---- Profile ----
  await step('Profil: ad değiştir', async () => {
    await page.goto(BASE + '/me');
    await wait(1500);
    await page.locator('input').first().fill('Murat T');
    await click(page.getByText('Kaydet', { exact: true }));
    assert(DB.profiles[0].display_name === 'Murat T', 'ad ' + DB.profiles[0].display_name);
  });

  await step('MCP anahtarı oluşturma', async () => {
    await click(page.getByText('Yeni anahtar oluştur'));
    await click(page.getByText('Oluştur', { exact: true }));
    assert(await page.getByText('Anahtarın hazır').isVisible(), 'anahtar paneli yok');
  });

  for (const [name, url] of [
    ['İbadet: ayet ekle', '/item/new?kind=verse'],
    ['Fikir ekle', '/item/new?kind=idea'],
    ['Özel gün ekle', '/item/new?kind=special_day'],
    ['Yemek planı ekle', '/item/new?kind=meal_plan'],
  ]) {
    await step(name, async () => {
      await page.goto(BASE + url);
      await wait(1300);
      const before = DB.items.length;
      await page.locator('input').first().fill(name + ' kaydı');
      await click(page.getByText('Kaydet', { exact: true }));
      assert(DB.items.length === before + 1, 'kayıt eklenmedi');
    });
  }

  await step('Takvim sekmesi: gün seç → bu güne görev ekle', async () => {
    await page.goto(BASE + '/plan');
    await wait(1200);
    await click(page.getByText('Takvim', { exact: true }));
    await click(page.getByText('Ekle', { exact: true }));
    assert(pathname().startsWith('/item/new') && page.url().includes('due='), page.url());
  });

  console.log(results.map((r) => r.join(' | ')).join('\n'));
  console.log(`\n${results.filter((r) => r[0] === 'PASS').length}/${results.length} geçti`);
  console.log(errors.length ? 'HATALAR:\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'konsol hatası yok');
  await b.close();
  srv.close();
})();
