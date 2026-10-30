import { router } from 'expo-router';
import { CalendarClock, Plus, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, IconTile, Progress } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useItems, useSettings } from '@/lib/data';
import { money, useGoalStats, useSavings } from '@/lib/goals';
import { useTheme } from '@/lib/theme';

export default function Goals() {
  const { c, accent } = useTheme();
  const settings = useSettings();
  const goals = useItems({ kind: 'goal', order: 'created' });
  const savings = useSavings();
  const stats = useGoalStats(goals.data ?? [], savings.data);
  const green = accent('green');
  const cur = settings.currency ?? 'TL';
  const totalSaved = Object.values(stats).reduce((t, s) => t + s.saved, 0);
  const totalTarget = Object.values(stats).reduce((t, s) => t + s.target, 0);

  return (
    <Screen
      title="Hedefler"
      subtitle="Birikim ve tasarruf"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push('/item/new?kind=goal')} accessibilityLabel="Hedef ekle" />}>
      {(goals.data?.length ?? 0) > 0 && (
        <Card tint={green.soft} style={{ gap: 10 }}>
          <Text variant="caption" tone="muted">
            Toplam birikim
          </Text>
          <Text variant="display" color={green.strong}>
            {money(totalSaved, cur)}
          </Text>
          <Progress value={totalTarget ? totalSaved / totalTarget : 0} color={green.strong} track="rgba(128,128,128,0.25)" />
          <Text variant="caption" tone="muted">
            {goals.data!.length} hedef · toplam {money(totalTarget, cur)}
          </Text>
        </Card>
      )}
      {!goals.isLoading && !goals.data?.length && (
        <EmptyState
          icon={Target}
          title="Henüz hedef yok"
          text="Bir hedef belirle (tutar + tarih); günde, haftada ve ayda ne kadar biriktirmen gerektiğini hesaplayalım."
        />
      )}
      {(goals.data ?? []).map((g) => {
        const s = stats[g.id];
        if (!s) return null;
        return (
          <Card key={g.id} onPress={() => router.push(`/goals/${g.id}`)} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon={Target} color={green.strong} bg={green.soft} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{g.title}</Text>
                <Text variant="caption" tone="muted">
                  {money(s.saved, cur)} / {money(s.target, cur)}
                </Text>
              </View>
              <Text variant="heading" color={green.strong}>
                %{Math.min(100, Math.round(s.pct * 100))}
              </Text>
            </View>
            <Progress value={s.pct} color={green.strong} />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {s.perDay !== null && s.remaining > 0 && (
                <Badge icon={CalendarClock} label={`Günde ${money(s.perDay, cur)}`} bg={green.soft} color={green.strong} />
              )}
              {s.daysLeft !== null && <Badge label={`${s.daysLeft} gün kaldı`} />}
              {s.onTrack === false && <Badge label="Hızlanmalısın" bg={c.warningSoft} color={c.warning} />}
              {s.remaining === 0 && s.target > 0 && <Badge label="Tamamlandı 🎉" bg={c.successSoft} color={c.success} />}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
