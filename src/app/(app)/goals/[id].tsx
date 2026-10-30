import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Pencil, PiggyBank, Plus, Scissors, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Divider, ListRow, Ring, SectionHeader, RuledList } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { notify } from '@/lib/confirm';
import { useAddLog, useDeleteLog, useItem, useSaveItem, useSettings } from '@/lib/data';
import { fmt, parseDay } from '@/lib/date';
import { uid } from '@/lib/fitness';
import { goalStats, money, useSavings, type Cut } from '@/lib/goals';
import { font, useTheme } from '@/lib/theme';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, accent } = useTheme();
  const { data: goal } = useItem(id);
  const savings = useSavings(id);
  const addLog = useAddLog();
  const delLog = useDeleteLog();
  const save = useSaveItem();
  const cur = useSettings().currency ?? 'TL';
  const curLabel = cur === '₺' ? 'TL' : cur;
  const [sheet, setSheet] = useState<null | 'add' | 'withdraw' | 'cut'>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const green = accent('green');

  if (!goal)
    return (
      <Screen title="Hedef" back>
        {null}
      </Screen>
    );
  const s = goalStats(goal, savings.data ?? []);

  const submitAmount = () => {
    const n = parseFloat(amount.replace(',', '.'));
    if (!n) return notify('Tutar gir');
    if (sheet === 'cut') {
      const cuts: Cut[] = [...s.cuts, { id: uid(), name: note.trim() || 'Tasarruf kalemi', monthly: n }];
      save.mutate({ id: goal.id, module: goal.module, kind: goal.kind, data: { ...goal.data, cuts } });
    } else {
      addLog.mutate({
        kind: 'saving',
        item_id: goal.id,
        amount: sheet === 'withdraw' ? -n : n,
        unit: curLabel,
        data: note.trim() ? { note: note.trim() } : {},
      });
    }
    setAmount('');
    setNote('');
    setSheet(null);
  };

  const removeCut = (cid: string) =>
    save.mutate({ id: goal.id, module: goal.module, kind: goal.kind, data: { ...goal.data, cuts: s.cuts.filter((x) => x.id !== cid) } });

  const stat = (label: string, value: string, hint?: string) => (
    <Card style={{ flex: 1, gap: 2, minWidth: '30%' }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
      {hint && (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      )}
    </Card>
  );

  return (
    <Screen title={goal.title} back right={<IconButton icon={Pencil} onPress={() => router.push(`/item/${goal.id}`)} accessibilityLabel="Düzenle" />}>
      <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 22 }}>
        <Ring value={s.pct} size={150} stroke={14} color={green.strong} track={green.soft}>
          <Text variant="title" color={green.strong}>
            %{Math.min(100, Math.round(s.pct * 100))}
          </Text>
        </Ring>
        <Text variant="display">{money(s.saved, cur)}</Text>
        <Text tone="muted">
          Hedef {money(s.target, cur)} · kalan {money(s.remaining, cur)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Button title="Biriktir" icon={Plus} onPress={() => setSheet('add')} style={{ flex: 1 }} />
          <Button title="Çek" icon={Minus} variant="outline" onPress={() => setSheet('withdraw')} />
        </View>
      </Card>

      {s.remaining > 0 && (
        <>
          <SectionHeader title={s.deadline ? `${fmt(s.deadline, 'd MMMM yyyy')} için gereken` : 'Gereken tempo'} />
          {s.perDay !== null ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {stat('Günde', money(s.perDay, cur), `${s.daysLeft} gün kaldı`)}
              {stat('Haftada', money(s.perWeek, cur))}
              {stat('Ayda', money(s.perMonth, cur))}
            </View>
          ) : (
            <Text variant="caption" tone="muted">
              Hedef tarihi eklersen günlük/haftalık/aylık ne kadar biriktirmen gerektiğini hesaplarım.
            </Text>
          )}
          {s.avgDaily > 0 && (
            <Card tint={s.onTrack === false ? c.warningSoft : green.soft} style={{ gap: 4 }}>
              <Text variant="bodyMedium">Şu anki temponla {s.projected ? fmt(s.projected, 'd MMMM yyyy') : '—'} tarihinde ulaşırsın</Text>
              <Text variant="caption" tone="muted">
                Ortalama günde {money(s.avgDaily, cur)} biriktiriyorsun
                {s.onTrack === false && s.perDay ? ` · hedef tarih için günde ${money(s.perDay - s.avgDaily, cur)} daha gerekli` : ''}
              </Text>
            </Card>
          )}
        </>
      )}

      <SectionHeader title="Tasarruf kalemleri" action="Ekle" onAction={() => setSheet('cut')} />
      <Card style={{ gap: 4 }}>
        <Text variant="caption" tone="muted">
          Vazgeçebileceğin harcamaları ekle (ör. dışarıda kahve, kullanılmayan abonelik). Hedefe ne kadar hızlı ulaşacağını göster.
        </Text>
        {s.cuts.map((cut) => (
          <ListRow
            key={cut.id}
            icon={Scissors}
            label={cut.name}
            hint={`Ayda ${money(cut.monthly, cur)} · günde ${money(cut.monthly / 30.4, cur)}`}
            right={
              <IconButton
                icon={Trash2}
                variant="ghost"
                size={32}
                color={c.textSubtle}
                onPress={() => removeCut(cut.id)}
                accessibilityLabel="Kaldır"
              />
            }
          />
        ))}
        {s.cutsMonthly > 0 && (
          <>
            <Divider />
            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
              Ayda{' '}
              <Text variant="bodyMedium" style={{ fontFamily: font.bold }} color={green.strong}>
                {money(s.cutsMonthly, cur)}
              </Text>{' '}
              tasarruf
            </Text>
            {s.monthsWithCuts !== null && s.remaining > 0 && (
              <Text variant="caption" tone="muted">
                Sadece bu kalemlerle hedefe yaklaşık{' '}
                {s.monthsWithCuts < 1 ? `${Math.ceil(s.monthsWithCuts * 30)} günde` : `${s.monthsWithCuts.toFixed(1)} ayda`} ulaşırsın.
              </Text>
            )}
          </>
        )}
      </Card>

      <SectionHeader title="Hareketler" />
      <RuledList>
        {(savings.data ?? []).length === 0 ? (
          <Text tone="muted" style={{ paddingVertical: 14 }}>
            Henüz birikim eklenmedi.
          </Text>
        ) : (
          savings.data!.map((l) => (
            <ListRow
              key={l.id}
              icon={PiggyBank}
              iconColor={l.amount < 0 ? c.danger : green.strong}
              iconBg={l.amount < 0 ? c.dangerSoft : green.soft}
              label={`${l.amount < 0 ? '−' : '+'}${money(Math.abs(l.amount), cur)}`}
              hint={[fmt(parseDay(l.day), 'd MMM yyyy'), l.data?.note].filter(Boolean).join(' · ')}
              right={
                <IconButton
                  icon={Trash2}
                  variant="ghost"
                  size={32}
                  color={c.textSubtle}
                  onPress={() => delLog.mutate(l.id)}
                  accessibilityLabel="Sil"
                />
              }
            />
          ))
        )}
      </RuledList>

      <Sheet
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet === 'cut' ? 'Tasarruf kalemi' : sheet === 'withdraw' ? 'Para çek' : 'Birikim ekle'}>
        {sheet === 'cut' && <Input label="Kalem" value={note} onChangeText={setNote} placeholder="ör. Dışarıda kahve" />}
        <Input
          label={sheet === 'cut' ? `Aylık tutar (${curLabel})` : `Tutar (${curLabel})`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus={sheet !== 'cut'}
        />
        {sheet !== 'cut' && <Input label="Not (isteğe bağlı)" value={note} onChangeText={setNote} />}
        <Button title="Kaydet" onPress={submitAmount} />
      </Sheet>
    </Screen>
  );
}
