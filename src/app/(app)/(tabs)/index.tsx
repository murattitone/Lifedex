import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { Button, haptic } from '@/components/ui/button';
import { Divider, SectionHeader, Ticks } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ALERT_KINDS, useUpcoming, type Upcoming } from '@/lib/alerts';
import { useAddLog, useItems, useProfile } from '@/lib/data';
import { addDays, daysBetween, dayKey, fmt, greeting } from '@/lib/date';
import { programData, useActiveProgram } from '@/lib/fitness';
import { toHijri } from '@/lib/hijri';
import { useModuleStatus } from '@/lib/status';
import { font, useTheme } from '@/lib/theme';
import { formatAmount, useTrackerTotals } from '@/lib/trackers';
import { MODULES } from '@/modules/registry';

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function Today() {
  const { data: profile } = useProfile();
  const trackers = useTrackerTotals(1);
  const endOfToday = addDays(new Date(new Date().setHours(0, 0, 0, 0)), 1).toISOString();
  const tasks = useItems({ kind: 'task', open: true, hasDue: true, dueTo: endOfToday, order: 'due', limit: 6 });
  const upcoming = useUpcoming(45);
  const { program, refetch: refetchProgram } = useActiveProgram();
  const status = useModuleStatus();

  const refresh = () => Promise.all([trackers.refetch(), tasks.refetch(), upcoming.refetch(), refetchProgram()]);
  const name = profile?.display_name?.split(' ')[0] ?? '';
  const news = upcoming.list.filter((a) => a.kind === 'news' && dayKey(a.date) === dayKey()).slice(0, 3);
  const dated = upcoming.list.filter((a) => a.kind !== 'news');

  return (
    <Screen dock refreshing={trackers.isRefetching} onRefresh={refresh}>
      <Leaf greetingText={`${greeting()}${name ? `, ${name}` : ''}`} upcoming={dated} />

      <SectionHeader index={1} title="Defter" action="Ayrıntı" onAction={() => router.push('/trackers')} />
      <Ledger summary={trackers.summary} />

      <SectionHeader index={2} title="Antrenman" action="Spor" onAction={() => router.push('/fitness')} />
      <Workout program={program} />

      <SectionHeader index={3} title="Bugün yapılacaklar" action="Plan" onAction={() => router.push('/plan')} />
      <View>
        {(tasks.data ?? []).map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 && <Divider />}
            <TaskRow item={t} />
          </Fragment>
        ))}
        <AddRow label="Görev ekle" onPress={() => router.push('/item/new?kind=task')} />
      </View>

      <SectionHeader index={4} title="Dizin" />
      <View>
        {MODULES.filter((m) => m.key !== 'trackers').map((m, i) => (
          <Fragment key={m.key}>
            {i > 0 && <Divider />}
            <IndexRow n={i + 1} title={m.title} status={status[m.key] ?? m.subtitle} onPress={() => router.push(m.href as any)} />
          </Fragment>
        ))}
      </View>

      {news.length > 0 && (
        <>
          <SectionHeader index={5} title="Gündem" action="Tümü" onAction={() => router.push('/alerts')} />
          <View>
            {news.map((n, i) => (
              <Fragment key={n.key}>
                {i > 0 && <Divider />}
                <NewsRow item={n} />
              </Fragment>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** Today's calendar leaf: weekday, giant date numeral, month/year, Hijri date and the day's note. */
function Leaf({ greetingText, upcoming }: { greetingText: string; upcoming: Upcoming[] }) {
  const { c } = useTheme();
  const now = new Date();
  const hijri = toHijri(now);
  const todayKey = dayKey(now);
  const todays = upcoming.filter((u) => dayKey(u.date) === todayKey || (u.end && u.date <= now && u.end >= now));
  const redLetter = now.getDay() === 0 || todays.some((u) => u.kind === 'holiday' || (u.kind === 'religious' && u.importance >= 3));
  const note = todays[0] ?? upcoming.find((u) => u.date > now);
  const inDays = note ? daysBetween(now, note.date) : 0;

  return (
    <View style={styles.leaf}>
      <View style={styles.leafTop}>
        <Text variant="overline" tone="muted">
          {greetingText}
        </Text>
        <Pressable onPress={() => router.push('/me')} hitSlop={10} accessibilityLabel="Profil">
          <Text variant="overline" tone="muted">
            Profil
          </Text>
        </Pressable>
      </View>
      <View style={[styles.rule, { backgroundColor: c.text }]} />
      <View style={styles.dateRow}>
        <Text variant="numeral" color={redLetter ? c.signal : c.text} accessibilityLabel={fmt(now, 'd MMMM yyyy EEEE')}>
          {now.getDate()}
        </Text>
        <View style={styles.dateMeta}>
          <Text variant="overline" color={redLetter ? c.signal : c.text}>
            {fmt(now, 'EEEE')}
          </Text>
          <Text variant="title" style={{ textTransform: 'capitalize' }}>
            {fmt(now, 'MMMM')}
          </Text>
          <Text variant="figure" tone="muted">
            {now.getFullYear()} · {isoWeek(now)}. hafta
          </Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
            {hijri.day} {hijri.monthName} {hijri.year}
          </Text>
        </View>
      </View>
      <View style={[styles.hair, { backgroundColor: c.border }]} />
      {note ? (
        <Pressable onPress={() => router.push('/alerts')} style={styles.note}>
          <Text variant="overline" color={note.importance >= 3 || note.kind === 'holiday' ? c.signal : c.textSubtle}>
            {inDays <= 0 ? 'Günün notu' : inDays === 1 ? 'Yarın' : `${inDays} gün sonra`}
          </Text>
          <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
            {note.title}
          </Text>
          <ArrowUpRight size={16} color={c.textSubtle} strokeWidth={1.8} />
        </Pressable>
      ) : (
        <Text variant="caption" tone="subtle">
          Önümüzdeki günlerde öne çıkan bir tarih yok.
        </Text>
      )}
    </View>
  );
}

function Ledger({ summary }: { summary: ReturnType<typeof useTrackerTotals>['summary'] }) {
  const { c } = useTheme();
  const add = useAddLog();
  return (
    <View>
      {summary.map((t, i) => {
        const step = t.quick[1];
        const done = t.value >= t.goal;
        return (
          <Fragment key={t.kind}>
            {i > 0 && <Divider />}
            <View style={styles.ledgerRow}>
              <Pressable style={{ flex: 1, gap: 8 }} onPress={() => router.push('/trackers')}>
                <View style={styles.ledgerHead}>
                  <Text variant="bodyMedium">{t.label}</Text>
                  <Text variant="figure" color={done ? c.success : c.text}>
                    {formatAmount(t.value, t.unit).replace(` ${t.unit}`, '')}
                    <Text variant="figure" tone="subtle">
                      {' / '}
                      {formatAmount(t.goal, t.unit)}
                    </Text>
                  </Text>
                </View>
                <Ticks
                  value={t.value}
                  goal={t.goal}
                  count={t.kind === 'water' ? Math.round(t.goal / 250) : 12}
                  color={done ? c.success : undefined}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`${t.label} +${step} ${t.unit}`}
                onPress={() => {
                  haptic('success');
                  add.mutate({ kind: t.kind, amount: step, unit: t.unit });
                }}
                style={({ pressed }) => [styles.quickAdd, { borderColor: c.borderStrong }, pressed && { backgroundColor: c.surfaceMuted }]}>
                <Text variant="label" style={{ fontFamily: font.semibold }}>
                  +{step}
                </Text>
              </Pressable>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

function Workout({ program }: { program: ReturnType<typeof useActiveProgram>['program'] }) {
  const pd = programData(program);
  const today = pd.days[pd.current_day];
  const next = pd.days.length > 1 ? pd.days[(pd.current_day + 1) % pd.days.length] : undefined;
  if (!program || !today) {
    return (
      <View style={{ gap: 10 }}>
        <Text tone="muted">Programını günlere böl; her antrenmanda kilo ve tekrarlarını kaydet, gelişimini burada gör.</Text>
        <Button
          title="Program oluştur"
          size="sm"
          variant="outline"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => router.push('/fitness/program/new')}
        />
      </View>
    );
  }
  const doneToday = pd.last_done === dayKey();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="subtle">
            Gün {pd.current_day + 1}/{pd.days.length} · {program.title}
          </Text>
          <Text variant="title" style={{ marginTop: 4 }}>
            {today.name}
          </Text>
        </View>
        <Button
          title={doneToday ? 'Bugün yapıldı' : 'Başla'}
          icon={doneToday ? undefined : ArrowRight}
          size="sm"
          variant={doneToday ? 'outline' : 'primary'}
          onPress={() => router.push('/fitness/workout')}
        />
      </View>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {today.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join('  ·  ') || 'Bu güne hareket eklenmemiş'}
      </Text>
      {next && (
        <Text variant="caption" tone="subtle">
          Sonraki gün: {next.name}
        </Text>
      )}
    </View>
  );
}

function IndexRow({ n, title, status, onPress }: { n: number; title: string; status: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.indexRow, pressed && { opacity: 0.55 }]}>
      <Text variant="figure" tone="subtle" style={{ width: 28 }}>
        {String(n).padStart(2, '0')}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {status}
        </Text>
      </View>
      <ArrowUpRight size={16} color={c.textSubtle} strokeWidth={1.8} />
    </Pressable>
  );
}

function NewsRow({ item }: { item: Upcoming }) {
  const host = item.url ? item.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
  return (
    <Pressable
      onPress={() => item.url && WebBrowser.openBrowserAsync(item.url)}
      style={({ pressed }) => [{ paddingVertical: 12, gap: 4 }, pressed && { opacity: 0.55 }]}>
      <Text variant="bodyMedium">{item.title}</Text>
      {item.body ? (
        <Text variant="caption" tone="muted" numberOfLines={3}>
          {item.body}
        </Text>
      ) : null}
      <Text variant="overline" tone="subtle">
        {ALERT_KINDS.news.label} · {host}
      </Text>
    </Pressable>
  );
}

function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.addRow, { borderTopColor: c.border }, pressed && { opacity: 0.55 }]}>
      <Plus size={16} color={c.textMuted} strokeWidth={1.8} />
      <Text variant="label" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  leaf: { paddingTop: 14, gap: 10 },
  leafTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rule: { height: 2 },
  hair: { height: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 2 },
  dateMeta: { flex: 1, paddingBottom: 12, gap: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  ledgerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  quickAdd: { width: 56, height: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  indexRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderTopWidth: 1 },
});
