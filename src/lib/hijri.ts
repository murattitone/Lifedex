// Hijri (Islamic) date for the "takvim yaprağı" — Umm al-Qura calendar (same as the server's alerts-sync).
// Order: Intl (web/iOS) → embedded Umm al-Qura month table for 1445–1470 AH (Hermes/Android) → tabular algorithm (±1 day).
const MONTHS = [
  'Muharrem',
  'Safer',
  'Rebiülevvel',
  'Rebiülahir',
  'Cemaziyelevvel',
  'Cemaziyelahir',
  'Recep',
  'Şaban',
  'Ramazan',
  'Şevval',
  'Zilkade',
  'Zilhicce',
];

export type Hijri = { day: number; month: number; year: number; monthName: string };

function viaIntl(d: Date): Hijri | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '', 10);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (!(year > 1300 && year < 1700) || !month || !day) return null; // runtime ignored the calendar
    return { day, month, year, monthName: MONTHS[month - 1] };
  } catch {
    return null;
  }
}

// Umm al-Qura month starts generated from ICU: first month = 1 Muharrem 1445 at UTC day 19557;
// each digit is (month length - 29).
const TABLE_BASE = 19557;
const TABLE_LENS =
  '01110100100101110110010010111010101001011011010100101011011010100101011011100100110110110010010110110101001010110110101001011010110100101010111010010010111101001001011101100100101101101010010101101010110010101101011001010101110101001001110110100100110111010001011011011001010101011010101001011011010100101101101';

function viaTable(d: Date): Hijri | null {
  const day = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  let start = TABLE_BASE;
  if (day < start) return null;
  for (let i = 0; i < TABLE_LENS.length; i++) {
    const len = 29 + Number(TABLE_LENS[i]);
    if (day < start + len) {
      const month = (i % 12) + 1;
      return { day: day - start + 1, month, year: 1445 + Math.floor(i / 12), monthName: MONTHS[month - 1] };
    }
    start += len;
  }
  return null;
}

function tabular(d: Date): Hijri {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd = day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const hd = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day: hd, month, year, monthName: MONTHS[month - 1] };
}

export function toHijri(d: Date = new Date()): Hijri {
  return viaIntl(d) ?? viaTable(d) ?? tabular(d);
}

export const __test = { tabular, viaIntl, viaTable };
