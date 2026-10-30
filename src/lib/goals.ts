import { useMemo } from 'react';

import { useLogs } from './data';
import { addDays, daysBetween } from './date';
import type { Item, Log } from './types';

export type Cut = { id: string; name: string; monthly: number };

export function useSavings(goalId?: string) {
  return useLogs({ kind: 'saving', itemId: goalId }, true);
}

/** Pure calculation of goal progress, required pace and projections. */
export function goalStats(goal: Item, logs: Log[]) {
  const target = Number(goal.data?.target_amount) || 0;
  const start = Number(goal.data?.start_amount) || 0;
  const contributed = logs.filter((l) => l.item_id === goal.id).reduce((t, l) => t + Number(l.amount), 0);
  const saved = start + contributed;
  const remaining = Math.max(0, target - saved);
  const pct = target ? saved / target : 0;
  const deadline = goal.due_at ? new Date(goal.due_at) : null;
  const daysLeft = deadline ? Math.max(0, daysBetween(new Date(), deadline)) : null;
  const perDay = daysLeft ? remaining / daysLeft : null;

  const since = Math.max(1, daysBetween(new Date(goal.created_at), new Date()));
  const avgDaily = contributed > 0 ? contributed / since : 0;
  const projected = avgDaily > 0 ? addDays(new Date(), Math.ceil(remaining / avgDaily)) : null;

  const cuts: Cut[] = goal.data?.cuts ?? [];
  const cutsMonthly = cuts.reduce((t, c) => t + (Number(c.monthly) || 0), 0);
  const monthsWithCuts = cutsMonthly > 0 ? remaining / cutsMonthly : null;

  return {
    target,
    saved,
    contributed,
    remaining,
    pct,
    deadline,
    daysLeft,
    perDay,
    perWeek: perDay !== null ? perDay * 7 : null,
    perMonth: perDay !== null ? perDay * 30.4 : null,
    avgDaily,
    projected,
    onTrack: perDay !== null && avgDaily > 0 ? avgDaily >= perDay : null,
    cuts,
    cutsMonthly,
    monthsWithCuts,
  };
}

/** Lira is written as a "TL" suffix: the UI font's ₺ glyph is easily misread as £. */
export const money = (n: number | null | undefined, cur = 'TL') => {
  if (n === null || n === undefined) return '—';
  const v = Math.round(n).toLocaleString('tr-TR');
  return cur === '₺' || cur === 'TL' ? `${v} TL` : `${cur}${v}`;
};

export function useGoalStats(goals: Item[], logs: Log[] | undefined) {
  return useMemo(() => Object.fromEntries(goals.map((g) => [g.id, goalStats(g, logs ?? [])])), [goals, logs]);
}
