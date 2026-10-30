import { useMemo } from 'react';

import { useItems, useLogs } from './data';
import type { Item, Log } from './types';

export type Exercise = { id: string; name: string; sets: number; reps: string; weight: number | null; note?: string };
export type WorkoutDay = { id: string; name: string; exercises: Exercise[] };
export type ProgramData = { days: WorkoutDay[]; current_day: number; last_done?: string };

export type SetLog = Log & {
  data: { exercise_id: string; exercise: string; set_no: number; reps: number; weight: number; day_index: number; day_name: string };
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function programData(p?: Item | null): ProgramData {
  const d = (p?.data ?? {}) as Partial<ProgramData>;
  return { days: d.days ?? [], current_day: d.current_day ?? 0, last_done: d.last_done };
}

export function useActiveProgram() {
  const q = useItems({ module: 'fitness', kind: 'workout_program', order: 'updated' });
  const program = q.data?.find((p) => p.status === 'active') ?? q.data?.[0] ?? null;
  return { ...q, program, programs: q.data ?? [] };
}

/** Upper bound of a reps target such as "8-10" -> 10, "12" -> 12 */
export const repsTarget = (reps: string) => {
  const nums = String(reps).match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums) : 0;
};

export type Session = { day: string; sets: { reps: number; weight: number; set_no: number }[]; top: number; volume: number };

/** Groups set logs into per-exercise session history (newest first). */
export function useExerciseHistory(programId?: string) {
  const q = useLogs({ kind: 'set', itemId: programId }, !!programId);
  const history = useMemo(() => {
    const map: Record<string, Session[]> = {};
    const byKey: Record<string, Session> = {};
    for (const l of (q.data ?? []) as SetLog[]) {
      const ex = l.data.exercise_id;
      const key = `${ex}|${l.day}`;
      if (!byKey[key]) {
        byKey[key] = { day: l.day, sets: [], top: 0, volume: 0 };
        (map[ex] ??= []).push(byKey[key]);
      }
      const s = byKey[key];
      s.sets.push({ reps: l.data.reps, weight: l.data.weight, set_no: l.data.set_no });
      s.top = Math.max(s.top, Number(l.data.weight) || 0);
      s.volume += (Number(l.data.weight) || 0) * (Number(l.data.reps) || 0);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.day < b.day ? 1 : -1));
      map[k].forEach((s) => s.sets.sort((a, b) => a.set_no - b.set_no));
    }
    return map;
  }, [q.data]);
  return { ...q, history, logs: (q.data ?? []) as SetLog[] };
}

/** Progressive-overload suggestion based on the last session. */
export function suggestNext(ex: Exercise, last?: Session) {
  if (!last || !last.sets.length) return { weight: ex.weight ?? null, note: 'İlk kayıt' };
  const target = repsTarget(ex.reps);
  const allHit = target > 0 && last.sets.length >= ex.sets && last.sets.every((s) => s.reps >= target);
  if (allHit) {
    const step = last.top >= 40 ? 2.5 : 1;
    return { weight: last.top + step, note: `Tüm setler tamam → +${step} kg dene` };
  }
  return { weight: last.top, note: 'Aynı ağırlıkla tekrarları artır' };
}

export const fmtKg = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('tr-TR')} kg`);
