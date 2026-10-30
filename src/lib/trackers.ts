import { BookOpenText, Droplets, Drumstick, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';

import { useLogs, useSettings } from './data';
import { addDays, dayKey } from './date';
import type { Accent } from './theme';

export type TrackerDef = {
  kind: 'water' | 'protein' | 'pages';
  label: string;
  unit: string;
  goalKey: 'water_goal' | 'protein_goal' | 'pages_goal';
  quick: number[];
  icon: LucideIcon;
  accent: Accent;
};

export const TRACKERS: TrackerDef[] = [
  { kind: 'water', label: 'Su', unit: 'ml', goalKey: 'water_goal', quick: [200, 250, 330, 500], icon: Droplets, accent: 'sky' },
  { kind: 'protein', label: 'Protein', unit: 'g', goalKey: 'protein_goal', quick: [10, 20, 30, 40], icon: Drumstick, accent: 'slate' },
  { kind: 'pages', label: 'Okuma', unit: 'sayfa', goalKey: 'pages_goal', quick: [5, 10, 20, 30], icon: BookOpenText, accent: 'violet' },
];

/** Totals per tracker for the last `days` days (keyed by YYYY-MM-DD). */
export function useTrackerTotals(days = 7) {
  const settings = useSettings();
  const from = dayKey(addDays(new Date(), -(days - 1)));
  const query = useLogs({ kind: TRACKERS.map((t) => t.kind), from });
  const totals = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const l of query.data ?? []) {
      map[l.kind] ??= {};
      map[l.kind][l.day] = (map[l.kind][l.day] ?? 0) + Number(l.amount);
    }
    return map;
  }, [query.data]);
  const today = dayKey();
  const summary = TRACKERS.map((t) => {
    const value = totals[t.kind]?.[today] ?? 0;
    const goal = Number(settings[t.goalKey]) || 1;
    return { ...t, value, goal, pct: value / goal };
  });
  return { ...query, totals, summary, today };
}

export const formatAmount = (n: number, unit: string) => {
  if (unit === 'ml' && n >= 1000) return `${(n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} L`;
  return `${Math.round(n).toLocaleString('tr-TR')} ${unit}`;
};
