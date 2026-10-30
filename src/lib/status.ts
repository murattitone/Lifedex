import { useMemo } from 'react';

import { useItems, useSettings } from './data';
import { relativeDay, startOfDay } from './date';
import { programData, useActiveProgram } from './fitness';
import { goalStats, money, useSavings } from './goals';
import { ideaScore } from '@/modules/kinds';

/** One live line per module for the home index ("Dizin") — what's actually going on, not a static subtitle. */
export function useModuleStatus(): Record<string, string> {
  const items = useItems({ kind: ['shopping', 'meal_plan', 'verse', 'book', 'movie', 'series', 'idea', 'goal', 'note', 'task'], limit: 1000 });
  const { program } = useActiveProgram();
  const savings = useSavings();
  const cur = useSettings().currency ?? 'TL';

  return useMemo(() => {
    const all = items.data ?? [];
    const of = (k: string) => all.filter((i) => i.kind === k);
    const out: Record<string, string> = {};

    const pd = programData(program);
    const day = pd.days[pd.current_day];
    out.fitness = program && day ? `Sıradaki: ${day.name} · ${day.exercises.length} hareket` : 'Program kurulmadı';

    const shop = of('shopping').filter((i) => !i.completed_at).length;
    const nextMeal = of('meal_plan')
      .filter((m) => m.due_at && new Date(m.due_at) >= startOfDay())
      .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1))[0];
    out.kitchen = [shop ? `${shop} ürün alınacak` : 'Liste boş', nextMeal ? `${relativeDay(nextMeal.due_at!)} ${nextMeal.title}` : null]
      .filter(Boolean)
      .join(' · ');

    const verses = of('verse').length;
    out.faith = `${verses ? `${verses} ayet` : 'Ayet eklenmedi'} · Kıble pusulası`;

    const reading = of('book').find((b) => b.status === 'in_progress');
    const wish = of('book')
      .concat(of('movie'), of('series'))
      .filter((b) => b.status === 'wishlist').length;
    out.growth = reading
      ? `${reading.title}${reading.data?.total_pages ? ` · s.${reading.data.current_page || 0}/${reading.data.total_pages}` : ''}`
      : wish
        ? `${wish} istek listesinde`
        : 'Kitap, film, dizi';

    const ideas = of('idea');
    out.ideas = ideas.length ? `${ideas.length} fikir · en yüksek ${Math.max(...ideas.map((i) => ideaScore(i.data)))} puan` : 'Fikir kutusu boş';

    const goals = of('goal');
    if (goals.length) {
      const stats = goals.map((g) => goalStats(g, savings.data ?? []));
      const saved = stats.reduce((t, s) => t + s.saved, 0);
      const target = stats.reduce((t, s) => t + s.target, 0);
      out.goals = `${money(saved, cur)} birikti · %${target ? Math.round((saved / target) * 100) : 0}`;
    } else out.goals = 'Hedef belirlenmedi';

    const open = of('task').filter((t) => !t.completed_at).length;
    out.planner = open ? `${open} açık görev` : 'Her şey tamam';
    out.notes = `${of('note').length} not`;
    out.trackers = 'Su, protein, okuma';
    return out;
  }, [items.data, program, savings.data, cur]);
}
