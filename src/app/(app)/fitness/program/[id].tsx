import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { confirm, notify } from '@/lib/confirm';
import { useDeleteItem, useItem, useItems, useSaveItem } from '@/lib/data';
import { programData, uid, type Exercise, type WorkoutDay } from '@/lib/fitness';
import { font, radius, useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';

const TEMPLATE: WorkoutDay[] = [
  { id: uid(), name: 'Push', exercises: [{ id: uid(), name: 'Bench Press', sets: 4, reps: '8-10', weight: null }] },
  { id: uid(), name: 'Pull', exercises: [{ id: uid(), name: 'Barbell Row', sets: 4, reps: '8-10', weight: null }] },
  { id: uid(), name: 'Legs', exercises: [{ id: uid(), name: 'Squat', sets: 4, reps: '6-8', weight: null }] },
];

export default function ProgramEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { data: item } = useItem(id);
  if (!isNew && !item) {
    return (
      <Screen title="Programı düzenle" back>
        <ActivityIndicator />
      </Screen>
    );
  }
  return <ProgramEditor key={item?.id ?? 'new'} item={item} />;
}

function ProgramEditor({ item }: { item?: Item }) {
  const isNew = !item;
  const programs = useItems({ module: 'fitness', kind: 'workout_program' });
  const save = useSaveItem();
  const del = useDeleteItem();
  const [title, setTitle] = useState(item?.title ?? 'Programım');
  const [days, setDays] = useState<WorkoutDay[]>(item ? programData(item).days : TEMPLATE);
  const [active, setActive] = useState(item ? item.status === 'active' : true);

  const updateDay = (i: number, patch: Partial<WorkoutDay>) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const updateEx = (di: number, ei: number, patch: Partial<Exercise>) =>
    updateDay(di, { exercises: days[di].exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) });

  const submit = async () => {
    if (!title.trim()) return notify('Program adı gerekli');
    const clean = days.map((d) => ({ ...d, name: d.name.trim() || 'Gün', exercises: d.exercises.filter((e) => e.name.trim()) }));
    const prev = programData(item);
    try {
      if (active) {
        // only one active program at a time
        await Promise.all(
          (programs.data ?? [])
            .filter((p) => p.id !== item?.id && p.status === 'active')
            .map((p) => save.mutateAsync({ id: p.id, module: 'fitness', kind: 'workout_program', status: 'inactive' })),
        );
      }
      await save.mutateAsync({
        id: item?.id,
        module: 'fitness',
        kind: 'workout_program',
        title: title.trim(),
        status: active ? 'active' : 'inactive',
        data: { ...item?.data, days: clean, current_day: Math.min(prev.current_day, Math.max(0, clean.length - 1)) },
      });
      router.back();
    } catch (e) {
      notify('Kaydedilemedi', (e as Error).message);
    }
  };

  const remove = async () => {
    if (!item || !(await confirm('Program silinsin mi?', 'Bu programa ait antrenman kayıtları da silinir.'))) return;
    await del.mutateAsync(item.id);
    router.back();
  };

  return (
    <Screen
      title={isNew ? 'Yeni program' : 'Programı düzenle'}
      back
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!isNew && <IconButton icon={Trash2} variant="destructive" size={46} onPress={remove} accessibilityLabel="Sil" />}
          <Button title="Kaydet" onPress={submit} loading={save.isPending} style={{ flex: 1 }} />
        </View>
      }>
      <Input label="Program adı" value={title} onChangeText={setTitle} />
      <SwitchRow label="Aktif program" hint="Ana sayfada ve antrenmanda bu program kullanılır" value={active} onChange={setActive} />

      {days.map((day, di) => (
        <Card key={day.id} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text variant="label" tone="muted">
              Gün {di + 1}
            </Text>
            <View style={{ flex: 1 }}>
              <Input value={day.name} onChangeText={(t) => updateDay(di, { name: t })} placeholder="ör. Push" />
            </View>
            <IconButton
              icon={Trash2}
              variant="ghost"
              size={34}
              onPress={() => setDays(days.filter((_, j) => j !== di))}
              accessibilityLabel="Günü sil"
            />
          </View>
          {day.exercises.map((ex, ei) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              onChange={(p) => updateEx(di, ei, p)}
              onRemove={() => updateDay(di, { exercises: day.exercises.filter((_, j) => j !== ei) })}
            />
          ))}
          <Button
            title="Hareket ekle"
            icon={Plus}
            size="sm"
            variant="outline"
            onPress={() => updateDay(di, { exercises: [...day.exercises, { id: uid(), name: '', sets: 3, reps: '10', weight: null }] })}
          />
        </Card>
      ))}
      <Button
        title="Gün ekle"
        icon={Plus}
        variant="secondary"
        onPress={() => setDays([...days, { id: uid(), name: `Gün ${days.length + 1}`, exercises: [] }])}
      />
    </Screen>
  );
}

function ExerciseRow({ ex, onChange, onRemove }: { ex: Exercise; onChange: (p: Partial<Exercise>) => void; onRemove: () => void }) {
  const { c } = useTheme();
  const cell = [styles.cell, { borderColor: c.border, color: c.text, backgroundColor: c.surface }];
  return (
    <View style={[styles.ex, { backgroundColor: c.surfaceMuted }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          value={ex.name}
          onChangeText={(t) => onChange({ name: t })}
          placeholder="Hareket adı"
          placeholderTextColor={c.textSubtle}
          style={[cell, { flex: 1, textAlign: 'left', fontFamily: font.medium }]}
        />
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Hareketi kaldır">
          <X size={18} color={c.textSubtle} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Labeled label="Set">
          <TextInput value={String(ex.sets)} onChangeText={(t) => onChange({ sets: parseInt(t, 10) || 0 })} keyboardType="number-pad" style={cell} />
        </Labeled>
        <Labeled label="Tekrar">
          <TextInput
            value={ex.reps}
            onChangeText={(t) => onChange({ reps: t })}
            placeholder="8-10"
            placeholderTextColor={c.textSubtle}
            style={cell}
          />
        </Labeled>
        <Labeled label="Kg">
          <TextInput
            value={ex.weight === null ? '' : String(ex.weight)}
            onChangeText={(t) => onChange({ weight: t === '' ? null : parseFloat(t.replace(',', '.')) || 0 })}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={c.textSubtle}
            style={cell}
          />
        </Labeled>
      </View>
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ex: { padding: 10, borderRadius: radius.md, gap: 10 },
  cell: {
    height: 40,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: 15,
    outlineStyle: 'none' as any,
  },
});
