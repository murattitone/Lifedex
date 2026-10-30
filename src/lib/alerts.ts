import { BadgePercent, CalendarHeart, Flag, MoonStar, Newspaper, PartyPopper, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';

import { useAlerts, useItems } from './data';
import { addDays, dayKey, nextYearly, parseDay } from './date';
import type { Accent } from './theme';

export type UpcomingKind = 'holiday' | 'religious' | 'shopping' | 'special' | 'news' | 'personal';

export const ALERT_KINDS: Record<UpcomingKind, { label: string; icon: LucideIcon; accent: Accent }> = {
  personal: { label: 'Benim günlerim', icon: CalendarHeart, accent: 'rose' },
  holiday: { label: 'Resmi tatil', icon: Flag, accent: 'rose' },
  religious: { label: 'Dini gün', icon: MoonStar, accent: 'green' },
  shopping: { label: 'İndirim', icon: BadgePercent, accent: 'orange' },
  special: { label: 'Özel gün', icon: PartyPopper, accent: 'slate' },
  news: { label: 'Gündem', icon: Newspaper, accent: 'slate' },
};

export type Upcoming = {
  key: string;
  kind: UpcomingKind;
  title: string;
  body?: string | null;
  url?: string | null;
  date: Date;
  end?: Date | null;
  importance: number;
  itemId?: string;
};

export function useUpcoming(days = 60) {
  const from = dayKey(addDays(new Date(), -1));
  const to = dayKey(addDays(new Date(), days));
  const alerts = useAlerts(from, to);
  const personal = useItems({ kind: 'special_day' });

  const list = useMemo(() => {
    const out: Upcoming[] = [];
    const today = parseDay(dayKey());
    for (const a of alerts.data ?? []) {
      const date = parseDay(a.starts_on);
      const end = a.ends_on ? parseDay(a.ends_on) : null;
      if ((end ?? date) < today && a.kind !== 'news') continue;
      out.push({ key: a.id, kind: a.kind, title: a.title, body: a.body, url: a.url, date, end, importance: a.importance });
    }
    const limit = addDays(today, days);
    for (const it of personal.data ?? []) {
      if (!it.due_at) continue;
      const due = new Date(it.due_at);
      const date = it.data?.yearly ? nextYearly(dayKey(due)) : parseDay(dayKey(due));
      if (date < today || date > limit) continue;
      out.push({ key: it.id, itemId: it.id, kind: 'personal', title: it.title, body: it.body, date, importance: 3 });
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime() || b.importance - a.importance);
  }, [alerts.data, personal.data, days]);

  return { list, isLoading: alerts.isLoading || personal.isLoading, refetch: () => Promise.all([alerts.refetch(), personal.refetch()]) };
}
