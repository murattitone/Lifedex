import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

export const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD */
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d: Date = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

export const fmt = (d: Date | string | number, pattern: string) => format(new Date(d), pattern, { locale: tr });

export function relativeDay(d: Date | string) {
  const date = new Date(d);
  if (isToday(date)) return 'Bugün';
  if (isTomorrow(date)) return 'Yarın';
  if (isYesterday(date)) return 'Dün';
  return fmt(date, 'd MMM EEE');
}

export function relativeDateTime(d: Date | string) {
  const date = new Date(d);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime ? `${relativeDay(date)} · ${fmt(date, 'HH:mm')}` : relativeDay(date);
}

export const fromNow = (d: Date | string) => formatDistanceToNowStrict(new Date(d), { locale: tr, addSuffix: true });

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

/** Next occurrence (today or later) of a yearly date stored as YYYY-MM-DD or MM-DD */
export function nextYearly(dateStr: string, from = new Date()) {
  const parts = dateStr.split('-').map(Number);
  const [m, d] = parts.length === 3 ? [parts[1], parts[2]] : parts;
  const today = startOfDay(from);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return next;
}
