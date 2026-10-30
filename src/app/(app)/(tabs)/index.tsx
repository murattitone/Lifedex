import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, BellRing, ChevronRight, Dumbbell, ListTodo, Settings2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, IconTile, Ring, SectionHeader } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ALERT_KINDS, useUpcoming } from '@/lib/alerts';
import { useItems, useProfile } from '@/lib/data';
import { addDays, dayKey, fmt, greeting, relativeDay } from '@/lib/date';
import { programData, useActiveProgram } from '@/lib/fitness';
import { font, radius, useTheme } from '@/lib/theme';
import { formatAmount, useTrackerTotals } from '@/lib/trackers';
import { MODULES } from '@/modules/registry';

export default function Home() {
  const { c, accent } = useTheme();
  const { data: profile } = useProfile();
  const trackers = useTrackerTotals(1);
  const endOfToday = addDays(new Date(new Date().setHours(0, 0, 0, 0)), 1).toISOString();
  const tasks = useItems({ kind: 'task', open: true, hasDue: true, dueTo: endOfToday, order: 'due', limit: 5 });
  const upcoming = useUpcoming(30);
  const { program, refetch: refetchProgram } = useActiveProgram();
  const name = profile?.display_name ?? '';

  const refresh = () => Promise.all([trackers.refetch(), tasks.refetch(), upcoming.refetch(), refetchProgram()]);
  const pd = programData(program);
  const today = pd.days[pd.current_day];
  const next = pd.days.length ? pd.days[(pd.current_day + 1) % pd.days.length] : undefined;
  const nextAlerts = upcoming.list.filter((a) => a.kind !== 'news').slice(0, 3);
  const news = upcoming.list.filter((a) => a.kind === 'news' && dayKey(a.date) === dayKey()).slice(0, 2);
  const homeModules = MODULES.filter((m) => m.showOnHome);

  return (
    <Screen dock refreshing={trackers.isRefetching} onRefresh={refresh}>
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/me')} style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
          <Text variant="heading" tone="primary">
            {(name[0] ?? 'H').toLocaleUpperCase('tr-TR')}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">
            {greeting()}
          </Text>
          <Text variant="heading" numberOfLines={1}>
            {name || 'Hoş geldin'}
          </Text>
        </View>
        <IconButton icon={BellRing} onPress={() => router.push('/alerts')} accessibilityLabel="Önemli" />
        <IconButton icon={Settings2} onPress={() => router.push('/me')} accessibilityLabel="Ayarlar" />
      </View>

      <Pressable onPress={() => router.push('/trackers')}>
        <LinearGradient colors={[c.primary, '#6E8BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.8)" style={{ textTransform: 'capitalize' }}>
                {fmt(new Date(), 'd MMMM EEEE')}
              </Text>
              <Text variant="title" color="#fff">
                Bugünkü hedeflerin
              </Text>
            </View>
            <View style={styles.heroArrow}>
              <ArrowRight size={18} color="#fff" />
            </View>
          </View>
          <View style={styles.rings}>
            {trackers.summary.map((t) => (
              <View key={t.kind} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                <Ring value={t.pct} size={62} stroke={6} color="#fff" track="rgba(255,255,255,0.25)">
                  <t.icon size={20} color="#fff" />
                </Ring>
                <Text variant="label" color="#fff" style={{ fontFamily: font.semibold }}>
                  {formatAmount(t.value, t.unit)}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  {t.label} · {Math.min(100, Math.round(t.pct * 100))}%
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.grid}>
        {homeModules.map((m) => {
          const a = accent(m.accent);
          return (
            <Card key={m.key} style={styles.module} onPress={() => router.push(m.href as any)}>
              <IconTile icon={m.icon} color={a.strong} bg={a.soft} size={40} />
              <View style={{ gap: 2 }}>
                <Text variant="bodyMedium">{m.title}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {m.subtitle}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="Bugünün antrenmanı" action="Spor" onAction={() => router.push('/fitness')} />
      {program && today ? (
        <Card tint={accent('blue').soft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={Dumbbell} color="#fff" bg={accent('blue').strong} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">
                {program.title} · Gün {pd.current_day + 1}/{pd.days.length}
              </Text>
              <Text variant="heading">{today.name}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {today.exercises.map((e) => e.name).join(' · ') || 'Hareket eklenmemiş'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 }}>
            <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
              Sonraki: {next?.name ?? '—'}
            </Text>
            <Button
              title={pd.last_done === dayKey() ? 'Bugün tamamlandı' : 'Başlat'}
              size="sm"
              variant="dark"
              onPress={() => router.push('/fitness/workout')}
            />
          </View>
        </Card>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Spor programın yok"
          text="Günlere ayrılmış programını oluştur, her antrenmanda ağırlık ve tekrarlarını kaydet."
          action={<Button title="Program oluştur" size="sm" variant="secondary" onPress={() => router.push('/fitness/program/new')} />}
        />
      )}

      <SectionHeader title="Bugün yapılacaklar" action="Tümü" onAction={() => router.push('/plan')} />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        {(tasks.data ?? []).length === 0 ? (
          <Pressable onPress={() => router.push('/item/new?kind=task')} style={styles.emptyRow}>
            <ListTodo size={18} color={c.textSubtle} />
            <Text tone="muted" style={{ flex: 1 }}>
              Bugün için görev yok. Eklemek için dokun.
            </Text>
          </Pressable>
        ) : (
          tasks.data!.map((t) => <TaskRow key={t.id} item={t} />)
        )}
      </Card>

      <SectionHeader title="Kaçırma" action="Tümü" onAction={() => router.push('/alerts')} />
      <View style={{ gap: 10 }}>
        {[...nextAlerts, ...news].map((a) => {
          const k = ALERT_KINDS[a.kind];
          const ac = accent(k.accent);
          return (
            <Card key={a.key} onPress={() => router.push('/alerts')} style={styles.alert}>
              <IconTile icon={k.icon} color={ac.strong} bg={ac.soft} size={38} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {a.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {k.label} · {relativeDay(a.date)}
                </Text>
              </View>
              <ChevronRight size={18} color={c.textSubtle} />
            </Card>
          );
        })}
        {nextAlerts.length + news.length === 0 && (
          <Text variant="caption" tone="muted">
            Önümüzdeki 30 günde öne çıkan bir gün yok.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.xl, padding: 18, gap: 18 },
  heroArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  rings: { flexDirection: 'row', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  module: { width: '47%', flexGrow: 1, gap: 14, minHeight: 116 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
