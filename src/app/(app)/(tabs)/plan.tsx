import { router } from 'expo-router';
import { CalendarPlus, ChevronRight, ListTodo, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { Button, IconButton } from '@/components/ui/button';
import { MonthCalendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ListRow, Segmented, RuledList } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ALERT_KINDS, useUpcoming } from '@/lib/alerts';
import { useItems, useSaveItem } from '@/lib/data';
import { addDays, dayKey, fmt, nextYearly, parseDay, startOfDay } from '@/lib/date';
import { useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { kindDef } from '@/modules/kinds';

export default function Plan() {
  const [tab, setTab] = useState<'tasks' | 'calendar'>('tasks');
  return (
    <Screen
      title="Planlayıcı"
      dock
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push('/item/new?kind=task')} accessibilityLabel="Görev ekle" />}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tasks', label: 'Görevler' },
          { value: 'calendar', label: 'Takvim' },
        ]}
      />
      {tab === 'tasks' ? <Tasks /> : <CalendarView />}
    </Screen>
  );
}

function Tasks() {
  const tasks = useItems({ kind: 'task', order: 'due' });
  const save = useSaveItem();
  const [draft, setDraft] = useState('');

  const groups = useMemo(() => {
    const now = startOfDay();
    const tomorrow = addDays(now, 1);
    const g = { overdue: [] as Item[], today: [] as Item[], upcoming: [] as Item[], someday: [] as Item[], done: [] as Item[] };
    for (const t of tasks.data ?? []) {
      if (t.completed_at) g.done.push(t);
      else if (!t.due_at) g.someday.push(t);
      else if (new Date(t.due_at) < now) g.overdue.push(t);
      else if (new Date(t.due_at) < tomorrow) g.today.push(t);
      else g.upcoming.push(t);
    }
    g.done.sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));
    return g;
  }, [tasks.data]);

  const quickAdd = () => {
    const title = draft.trim();
    if (!title) return;
    save.mutate({ module: 'planner', kind: 'task', title, status: 'todo' });
    setDraft('');
  };

  const sections: [string, Item[]][] = [
    ['Gecikmiş', groups.overdue],
    ['Bugün', groups.today],
    ['Yaklaşan', groups.upcoming],
    ['Tarihsiz', groups.someday],
    ['Tamamlanan', groups.done.slice(0, 10)],
  ];

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input value={draft} onChangeText={setDraft} placeholder="Hızlı görev ekle…" onSubmitEditing={quickAdd} returnKeyType="done" />
        </View>
        <IconButton icon={Plus} variant="secondary" size={48} onPress={quickAdd} accessibilityLabel="Ekle" />
      </View>
      {!tasks.isLoading && (tasks.data ?? []).length === 0 && (
        <EmptyState
          icon={ListTodo}
          title="Görev listen boş"
          text="Tarih ve hatırlatma ekleyerek görevlerini planla. Hatırlatmalar bildirim olarak gelir."
        />
      )}
      {sections
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <View key={title} style={{ gap: 6 }}>
            <Text variant="label" tone="muted">
              {title} · {list.length}
            </Text>
            <RuledList>
              {list.map((t) => (
                <TaskRow key={t.id} item={t} />
              ))}
            </RuledList>
          </View>
        ))}
    </>
  );
}

function CalendarView() {
  const { c, accent } = useTheme();
  const [day, setDay] = useState(dayKey());
  const dated = useItems({ kind: ['task', 'meal_plan', 'special_day', 'goal'], hasDue: true });
  const upcoming = useUpcoming(365);

  const { marks, byDay } = useMemo(() => {
    const marks: Record<string, string[]> = {};
    const byDay: Record<string, { key: string; title: string; sub: string; icon: any; a: { soft: string; strong: string }; onPress?: () => void }[]> =
      {};
    const push = (k: string, color: string, entry: (typeof byDay)[string][number]) => {
      if (!(marks[k] ??= []).includes(color)) marks[k].push(color);
      (byDay[k] ??= []).push(entry);
    };
    for (const it of dated.data ?? []) {
      const def = kindDef(it.kind);
      if (!def || !it.due_at) continue;
      const a = accent(def.accent);
      const d = it.kind === 'special_day' && it.data?.yearly ? nextYearly(dayKey(new Date(it.due_at))) : new Date(it.due_at);
      const hasTime = it.kind === 'task' || it.kind === 'meal_plan';
      push(dayKey(d), a.strong, {
        key: it.id,
        title: it.title,
        sub: `${def.label}${hasTime ? ` · ${fmt(it.due_at, 'HH:mm')}` : ''}${it.completed_at ? ' · tamamlandı' : ''}`,
        icon: def.icon,
        a,
        onPress: () => router.push(`/item/${it.id}`),
      });
    }
    for (const u of upcoming.list) {
      if (u.kind === 'personal' || u.kind === 'news') continue;
      const k = ALERT_KINDS[u.kind];
      const a = accent(k.accent);
      push(dayKey(u.date), a.strong, { key: u.key, title: u.title, sub: k.label, icon: k.icon, a });
    }
    return { marks, byDay };
  }, [dated.data, upcoming.list, accent]);

  const list = byDay[day] ?? [];
  const at9 = (() => {
    const d = parseDay(day);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  })();

  return (
    <>
      <Card>
        <MonthCalendar value={day} onChange={setDay} marks={marks} />
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="heading" style={{ textTransform: 'capitalize' }}>
          {fmt(parseDay(day), 'd MMMM EEEE')}
        </Text>
        <Button
          title="Ekle"
          icon={CalendarPlus}
          size="sm"
          variant="secondary"
          onPress={() => router.push(`/item/new?kind=task&due=${encodeURIComponent(at9)}`)}
        />
      </View>
      <RuledList>
        {list.length === 0 ? (
          <Text tone="muted" style={{ paddingVertical: 14 }}>
            Bu gün için kayıt yok.
          </Text>
        ) : (
          list.map((e) => (
            <ListRow
              key={e.key}
              label={e.title}
              hint={e.sub}
              icon={e.icon}
              iconColor={e.a.strong}
              iconBg={e.a.soft}
              onPress={e.onPress}
              right={e.onPress ? <ChevronRight size={18} color={c.textSubtle} /> : <View />}
            />
          ))
        )}
      </RuledList>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          ['Görev / plan', c.text],
          ['Tatil · özel gün', c.signal],
          ['Dini gün · hedef', c.success],
          ['İndirim', c.warning],
        ].map(([l, col]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
            <Text variant="caption" tone="muted">
              {l}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}
