import { BookOpen, CalendarCheck, ChefHat, Droplets, Dumbbell, Lightbulb, MoonStar, NotebookPen, Target, type LucideIcon } from 'lucide-react-native';

import type { Accent } from '@/lib/theme';

/**
 * App sections. To add a new section:
 *  1. add an entry here (key = items.module value),
 *  2. add its record kinds to `kinds.ts` (the generic editor at /item/[id] then works out of the box),
 *  3. optionally add a custom list screen under src/app/<key>/.
 * No database migration is needed: everything lives in the generic `items` / `logs` tables.
 */
export type ModuleDef = {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: Accent;
  href: string;
  showOnHome?: boolean;
};

export const MODULES: ModuleDef[] = [
  { key: 'fitness', title: 'Spor', subtitle: 'Program ve gelişim', icon: Dumbbell, accent: 'blue', href: '/fitness', showOnHome: true },
  { key: 'kitchen', title: 'Mutfak', subtitle: 'Liste, tarif, plan', icon: ChefHat, accent: 'orange', href: '/kitchen', showOnHome: true },
  { key: 'faith', title: 'İbadet', subtitle: 'Ayetler ve kıble', icon: MoonStar, accent: 'teal', href: '/faith', showOnHome: true },
  { key: 'growth', title: 'Gelişim', subtitle: 'Kitap, film, dizi', icon: BookOpen, accent: 'violet', href: '/growth', showOnHome: true },
  { key: 'ideas', title: 'Fikirler', subtitle: 'Üretim ve iş', icon: Lightbulb, accent: 'amber', href: '/ideas', showOnHome: true },
  { key: 'goals', title: 'Hedefler', subtitle: 'Birikim ve tasarruf', icon: Target, accent: 'green', href: '/goals', showOnHome: true },
  { key: 'trackers', title: 'Takip', subtitle: 'Su, protein, sayfa', icon: Droplets, accent: 'sky', href: '/trackers' },
  { key: 'planner', title: 'Planlayıcı', subtitle: 'Görev ve takvim', icon: CalendarCheck, accent: 'rose', href: '/plan' },
  { key: 'notes', title: 'Notlar', subtitle: 'Serbest notlar', icon: NotebookPen, accent: 'slate', href: '/notes' },
];

export const moduleByKey = (key: string) => MODULES.find((m) => m.key === key);
