import { router } from 'expo-router';
import { Dumbbell, Pencil, Play, Plus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Bars } from '@/components/charts';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, ChipSelect, Divider, EmptyState, SectionHeader } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { dayKey, fmt, parseDay } from '@/lib/date';
import { fmtKg, programData, suggestNext, useActiveProgram, useExerciseHistory, type Session, type WorkoutDay } from '@/lib/fitness';
import { font, radius, useTheme } from '@/lib/theme';

export default function Fitness() {
  const { c, accent } = useTheme();
  const { programs, program: active, isLoading } = useActiveProgram();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const program = programs.find((p) => p.id === selectedId) ?? active;
  const pd = programData(program);
  const { history } = useExerciseHistory(program?.id);
  const blue = accent('blue');

  if (!isLoading && !program) {
    return (
      <Screen title="Spor" back>
        <EmptyState
          icon={Dumbbell}
          title="İlk programını oluştur"
          text="Programını günlere böl (ör. Push / Pull / Legs), her güne hareketlerini ve hedef set-tekrar-ağırlığını ekle."
          action={<Button title="Program oluştur" icon={Plus} onPress={() => router.push('/fitness/program/new')} />}
        />
      </Screen>
    );
  }

  const today = pd.days[pd.current_day];
  const nextIndex = pd.days.length ? (pd.current_day + 1) % pd.days.length : 0;
  const next = pd.days[nextIndex];

  return (
    <Screen
      title="Spor"
      subtitle={program?.title}
      back
      right={
        <IconButton icon={Pencil} onPress={() => program && router.push(`/fitness/program/${program.id}`)} accessibilityLabel="Programı düzenle" />
      }>
      {programs.length > 1 && (
        <ChipSelect value={program?.id} onChange={setSelectedId} options={programs.map((p) => ({ value: p.id, label: p.title }))} />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {pd.days.map((d, i) => {
          const isCurrent = i === pd.current_day;
          return (
            <View
              key={d.id}
              style={[styles.dayPill, { backgroundColor: isCurrent ? blue.strong : c.surface, borderColor: isCurrent ? blue.strong : c.border }]}>
              <Text variant="caption" color={isCurrent ? c.primaryText : c.textSubtle} style={isCurrent ? { opacity: 0.7 } : undefined}>
                Gün {i + 1}
              </Text>
              <Text variant="label" style={{ fontFamily: font.semibold }} color={isCurrent ? c.primaryText : c.text} numberOfLines={1}>
                {d.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {today && (
        <Card tint={blue.soft} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">
                Bugün · Gün {pd.current_day + 1}
              </Text>
              <Text variant="title">{today.name}</Text>
            </View>
            {pd.last_done === dayKey() && <Badge label="Bugün yapıldı" bg={c.successSoft} color={c.success} />}
          </View>
          <DayPlan day={today} history={history} />
          <Button title="Antrenmanı başlat" icon={Play} variant="dark" onPress={() => router.push(`/fitness/workout?program=${program!.id}`)} />
        </Card>
      )}

      {next && pd.days.length > 1 && (
        <>
          <SectionHeader title={`Sonraki gün · ${next.name}`} />
          <Card>
            <DayPlan day={next} history={history} showSuggestion />
          </Card>
        </>
      )}

      <SectionHeader title="Gelişim" />
      <Progress days={pd.days} history={history} />
    </Screen>
  );
}

function DayPlan({ day, history, showSuggestion }: { day: WorkoutDay; history: Record<string, Session[]>; showSuggestion?: boolean }) {
  const { c } = useTheme();
  if (!day.exercises.length) return <Text tone="muted">Bu güne hareket eklenmemiş.</Text>;
  return (
    <View style={{ gap: 10 }}>
      {day.exercises.map((ex, i) => {
        const last = history[ex.id]?.[0];
        const sug = suggestNext(ex, last);
        return (
          <View key={ex.id} style={{ gap: 8 }}>
            {i > 0 && <Divider />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{ex.name}</Text>
                <Text variant="caption" tone="muted">
                  Hedef {ex.sets}×{ex.reps}
                  {ex.weight ? ` · ${fmtKg(ex.weight)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" tone="subtle">
                  {last ? `Son: ${fmt(parseDay(last.day), 'd MMM')}` : 'Henüz kayıt yok'}
                </Text>
                {last && (
                  <Text variant="label" style={{ fontFamily: font.semibold }}>
                    {last.sets.map((s) => `${s.weight}×${s.reps}`).join('  ')}
                  </Text>
                )}
              </View>
            </View>
            {showSuggestion && sug.weight !== null && (
              <View style={[styles.suggest, { backgroundColor: c.surfaceMuted }]}>
                <TrendingUp size={14} color={c.success} />
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  Öneri:{' '}
                  <Text variant="caption" style={{ fontFamily: font.semibold }}>
                    {fmtKg(sug.weight)}
                  </Text>{' '}
                  · {sug.note}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Progress({ days, history }: { days: WorkoutDay[]; history: Record<string, Session[]> }) {
  const { c, accent } = useTheme();
  const exercises = days.flatMap((d) => d.exercises).filter((e) => history[e.id]?.length);
  if (!exercises.length) {
    return (
      <Text variant="caption" tone="muted">
        Antrenman kaydettikçe her hareket için ağırlık gelişimin burada görünecek.
      </Text>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {exercises.map((ex) => {
        const sessions = [...history[ex.id]].reverse().slice(-8);
        const first = sessions[0].top;
        const last = sessions[sessions.length - 1].top;
        const diff = last - first;
        const up = diff >= 0;
        return (
          <Card key={ex.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{ex.name}</Text>
                <Text variant="caption" tone="muted">
                  {sessions.length} antrenman · en iyi {fmtKg(Math.max(...sessions.map((s) => s.top)))}
                </Text>
              </View>
              <Pressable style={[styles.delta, { backgroundColor: up ? c.successSoft : c.dangerSoft }]}>
                {up ? <TrendingUp size={14} color={c.success} /> : <TrendingDown size={14} color={c.danger} />}
                <Text variant="label" color={up ? c.success : c.danger} style={{ fontFamily: font.semibold }}>
                  {up ? '+' : ''}
                  {diff.toLocaleString('tr-TR')} kg
                </Text>
              </Pressable>
            </View>
            <Bars
              values={sessions.map((s) => s.top)}
              labels={sessions.map((s) => fmt(parseDay(s.day), 'd/M'))}
              color={accent('blue').strong}
              height={70}
            />
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, minWidth: 92 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
});
