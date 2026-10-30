import { router } from 'expo-router';
import { Plus, Settings2, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bars } from '@/components/charts';
import { Button, haptic, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChipSelect, Ring } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useAddLog, useDeleteLog, useItems, useLogs, useSaveItem } from '@/lib/data';
import { addDays, dayKey, fmt } from '@/lib/date';
import { font, radius, useTheme } from '@/lib/theme';
import { formatAmount, useTrackerTotals, type TrackerDef } from '@/lib/trackers';

export default function Trackers() {
  const totals = useTrackerTotals(7);
  return (
    <Screen
      title="Günlük takip"
      subtitle={fmt(new Date(), 'd MMMM EEEE')}
      back
      refreshing={totals.isRefetching}
      onRefresh={totals.refetch}
      right={<IconButton icon={Settings2} onPress={() => router.push('/me')} accessibilityLabel="Hedefleri düzenle" />}>
      {totals.summary.map((t) => (
        <TrackerCard key={t.kind} t={t} value={t.value} goal={t.goal} week={totals.totals[t.kind] ?? {}} />
      ))}
    </Screen>
  );
}

function TrackerCard({ t, value, goal, week }: { t: TrackerDef; value: number; goal: number; week: Record<string, number> }) {
  const { c, accent } = useTheme();
  const a = accent(t.accent);
  const add = useAddLog();
  const del = useDeleteLog();
  const save = useSaveItem();
  const todayLogs = useLogs({ kind: t.kind, from: dayKey(), to: dayKey() });
  const books = useItems({ kind: 'book', status: 'in_progress' }, t.kind === 'pages');
  const [bookId, setBookId] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState('');

  const selectedBook = (books.data ?? []).find((b) => b.id === bookId) ?? books.data?.[0];
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));

  const log = (n: number) => {
    if (!n) return;
    haptic('success');
    add.mutate({ kind: t.kind, amount: n, unit: t.unit, item_id: t.kind === 'pages' ? (selectedBook?.id ?? null) : null });
    if (t.kind === 'pages' && selectedBook) {
      const total = Number(selectedBook.data?.total_pages) || Infinity;
      save.mutate({
        id: selectedBook.id,
        module: selectedBook.module,
        kind: selectedBook.kind,
        data: { ...selectedBook.data, current_page: Math.min(total, (Number(selectedBook.data?.current_page) || 0) + n) },
      });
    }
  };

  const last = todayLogs.data?.[0];
  const pct = value / goal;
  const remaining = Math.max(0, goal - value);

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring value={pct} size={88} stroke={9} color={a.strong} track={a.soft}>
          <t.icon size={26} color={a.strong} />
        </Ring>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" tone="muted">
            {t.label}
          </Text>
          <Text variant="stat">{formatAmount(value, t.unit)}</Text>
          <Text variant="caption" tone={remaining ? 'muted' : 'success'}>
            {remaining ? `Hedefe ${formatAmount(remaining, t.unit)} kaldı · hedef ${formatAmount(goal, t.unit)}` : 'Günlük hedef tamam 🎉'}
          </Text>
        </View>
        {last && <IconButton icon={Undo2} size={36} onPress={() => del.mutate(last.id)} accessibilityLabel="Son kaydı geri al" />}
      </View>

      {t.kind === 'pages' && (books.data?.length ?? 0) > 0 && (
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="muted">
            Okuduğun kitap
          </Text>
          <ChipSelect value={selectedBook?.id} onChange={setBookId} options={(books.data ?? []).map((b) => ({ value: b.id, label: b.title }))} />
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {t.quick.map((q) => (
          <Pressable
            key={q}
            onPress={() => log(q)}
            style={({ pressed }) => [styles.quick, { backgroundColor: a.soft }, pressed && { opacity: 0.75 }]}>
            <Text variant="label" color={a.strong} style={{ fontFamily: font.semibold }}>
              +{q}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setCustom(true)}
          style={[styles.quick, { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }]}
          accessibilityLabel="Özel miktar">
          <Plus size={18} color={c.textMuted} />
        </Pressable>
      </View>

      <Bars values={days.map((d) => week[dayKey(d)] ?? 0)} labels={days.map((d) => fmt(d, 'EEEEEE'))} goal={goal} color={a.strong} height={72} />

      <Sheet visible={custom} onClose={() => setCustom(false)} title={`${t.label} ekle (${t.unit})`}>
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Miktar" autoFocus />
        <Button
          title="Ekle"
          onPress={() => {
            log(parseFloat(amount.replace(',', '.')) || 0);
            setAmount('');
            setCustom(false);
          }}
        />
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  quick: { flex: 1, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
