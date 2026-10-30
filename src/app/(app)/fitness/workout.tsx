import { router, useLocalSearchParams } from 'expo-router';
import { Check, Dumbbell, Plus, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, haptic } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect, EmptyState } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { notify } from '@/lib/confirm';
import { useAddLog, useDeleteLog, useSaveItem } from '@/lib/data';
import { dayKey } from '@/lib/date';
import { fmtKg, programData, repsTarget, suggestNext, useActiveProgram, useExerciseHistory, type Exercise } from '@/lib/fitness';
import { font, radius, useTheme } from '@/lib/theme';

export default function Workout() {
  const params = useLocalSearchParams<{ program?: string; day?: string }>();
  const { programs, program: active } = useActiveProgram();
  const program = programs.find((p) => p.id === params.program) ?? active;
  const pd = programData(program);
  const [dayIndex, setDayIndex] = useState<number | null>(params.day !== undefined && !Number.isNaN(Number(params.day)) ? Number(params.day) : null);
  const di = dayIndex !== null && dayIndex < pd.days.length ? dayIndex : pd.current_day;
  const day = pd.days[di];
  const today = dayKey();
  const { logs, history } = useExerciseHistory(program?.id);
  const save = useSaveItem();

  const todays = logs.filter((l) => l.day === today && l.data.day_index === di);
  const volume = todays.reduce((t, l) => t + (Number(l.data.weight) || 0) * (Number(l.data.reps) || 0), 0);

  if (!program || !day) {
    return (
      <Screen title="Antrenman" back>
        <EmptyState
          icon={Dumbbell}
          title="Aktif program yok"
          text="Önce bir spor programı oluştur."
          action={<Button title="Program oluştur" size="sm" onPress={() => router.replace('/fitness/program/new')} />}
        />
      </Screen>
    );
  }

  const finish = async () => {
    try {
      await save.mutateAsync({
        id: program.id,
        module: 'fitness',
        kind: 'workout_program',
        data: { ...program.data, current_day: (di + 1) % pd.days.length, last_done: today },
      });
      haptic('success');
      notify(
        'Harika iş! 💪',
        `${todays.length} set · ${Math.round(volume).toLocaleString('tr-TR')} kg toplam hacim. Sıradaki: ${pd.days[(di + 1) % pd.days.length].name}`,
      );
      router.back();
    } catch (e) {
      notify('Kaydedilemedi', (e as Error).message);
    }
  };

  return (
    <Screen
      title={day.name}
      subtitle={`${program.title} · Gün ${di + 1}/${pd.days.length}`}
      back
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              {todays.length} set kaydedildi
            </Text>
            <Text variant="bodyMedium">{Math.round(volume).toLocaleString('tr-TR')} kg hacim</Text>
          </View>
          <Button title="Antrenmanı bitir" icon={Trophy} onPress={finish} loading={save.isPending} disabled={!todays.length} />
        </View>
      }>
      {pd.days.length > 1 && (
        <ChipSelect
          value={String(di)}
          onChange={(v) => setDayIndex(Number(v))}
          options={pd.days.map((d, i) => ({ value: String(i), label: `${i + 1}. ${d.name}` }))}
        />
      )}
      {day.exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          ex={ex}
          programId={program.id}
          dayIndex={di}
          dayName={day.name}
          logged={todays.filter((l) => l.data.exercise_id === ex.id)}
          previous={history[ex.id]?.find((s) => s.day !== today)}
        />
      ))}
    </Screen>
  );
}

function ExerciseCard({
  ex,
  programId,
  dayIndex,
  dayName,
  logged,
  previous,
}: {
  ex: Exercise;
  programId: string;
  dayIndex: number;
  dayName: string;
  logged: ReturnType<typeof useExerciseHistory>['logs'];
  previous?: ReturnType<typeof useExerciseHistory>['history'][string][number];
}) {
  const { c } = useTheme();
  const add = useAddLog();
  const remove = useDeleteLog();
  const sug = suggestNext(ex, previous);
  const [extra, setExtra] = useState(0);
  const count = Math.max(ex.sets, logged.length) + extra;
  const [draft, setDraft] = useState<Record<number, { w: string; r: string }>>({});

  const rowValue = (n: number) => {
    const l = logged.find((x) => x.data.set_no === n);
    if (l) return { w: String(l.data.weight), r: String(l.data.reps), log: l };
    const d = draft[n];
    const prevSet = previous?.sets.find((s) => s.set_no === n);
    return {
      w: d?.w ?? String(sug.weight ?? prevSet?.weight ?? ex.weight ?? ''),
      r: d?.r ?? String(repsTarget(ex.reps) || prevSet?.reps || ''),
      log: undefined,
    };
  };

  const toggle = (n: number) => {
    const v = rowValue(n);
    if (v.log) return remove.mutate(v.log.id);
    const weight = parseFloat(v.w.replace(',', '.')) || 0;
    const reps = parseInt(v.r, 10) || 0;
    if (!reps) return notify('Tekrar sayısını gir');
    haptic('success');
    add.mutate({
      kind: 'set',
      item_id: programId,
      amount: weight * reps,
      unit: 'kg',
      data: { exercise_id: ex.id, exercise: ex.name, set_no: n, reps, weight, day_index: dayIndex, day_name: dayName },
    });
  };

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{ex.name}</Text>
          <Text variant="caption" tone="muted">
            Hedef {ex.sets}×{ex.reps} · Öneri {fmtKg(sug.weight)}
          </Text>
        </View>
      </View>
      <View style={styles.headRow}>
        <Text variant="caption" tone="subtle" style={{ width: 28 }}>
          Set
        </Text>
        <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
          Önceki
        </Text>
        <Text variant="caption" tone="subtle" style={styles.colHead}>
          Kg
        </Text>
        <Text variant="caption" tone="subtle" style={styles.colHead}>
          Tekrar
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const v = rowValue(n);
        const prev = previous?.sets.find((s) => s.set_no === n);
        const done = !!v.log;
        const input = [styles.input, { borderColor: c.border, color: c.text, backgroundColor: done ? c.successSoft : c.surfaceMuted }];
        return (
          <View key={n} style={styles.row}>
            <Text variant="label" style={{ width: 28, fontFamily: font.semibold }}>
              {n}
            </Text>
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              {prev ? `${prev.weight}×${prev.reps}` : '—'}
            </Text>
            <TextInput
              editable={!done}
              value={v.w}
              keyboardType="decimal-pad"
              onChangeText={(t) => setDraft((d) => ({ ...d, [n]: { w: t, r: d[n]?.r ?? v.r } }))}
              style={input}
            />
            <TextInput
              editable={!done}
              value={v.r}
              keyboardType="number-pad"
              onChangeText={(t) => setDraft((d) => ({ ...d, [n]: { w: d[n]?.w ?? v.w, r: t } }))}
              style={input}
            />
            <Pressable
              onPress={() => toggle(n)}
              accessibilityLabel={done ? 'Seti geri al' : 'Seti kaydet'}
              style={[styles.check, { backgroundColor: done ? c.success : c.surface, borderColor: done ? c.success : c.borderStrong }]}>
              <Check size={18} color={done ? '#fff' : c.textSubtle} strokeWidth={2.6} />
            </Pressable>
          </View>
        );
      })}
      <Button title="Set ekle" icon={Plus} variant="ghost" size="sm" onPress={() => setExtra((e) => e + 1)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colHead: { width: 64, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    width: 64,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontFamily: font.semibold,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
  check: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
