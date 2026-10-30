import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BellRing, CalendarHeart, ExternalLink } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, ChipSelect, EmptyState, IconTile } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ALERT_KINDS, useUpcoming, type Upcoming, type UpcomingKind } from '@/lib/alerts';
import { refreshAlerts } from '@/lib/data';
import { daysBetween, fmt } from '@/lib/date';
import { useTheme } from '@/lib/theme';

type Filter = 'all' | UpcomingKind;

export default function Alerts() {
  const { list, refetch, isLoading } = useUpcoming(120);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(() => {
    const items = list.filter((a) => filter === 'all' || a.kind === filter);
    const g: [string, Upcoming[]][] = [
      ['Bugün ve yarın', []],
      ['Bu hafta', []],
      ['Bu ay', []],
      ['Daha sonra', []],
    ];
    for (const a of items) {
      const d = Math.max(0, daysBetween(new Date(), a.date));
      g[d <= 1 ? 0 : d <= 7 ? 1 : d <= 31 ? 2 : 3][1].push(a);
    }
    return g.filter(([, l]) => l.length);
  }, [list, filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAlerts();
    await refetch();
    setRefreshing(false);
  };

  return (
    <Screen
      title="Önemli"
      subtitle="Tatiller, dini günler, indirimler ve gündem"
      dock
      refreshing={refreshing}
      onRefresh={onRefresh}
      right={
        <IconButton
          icon={CalendarHeart}
          variant="primary"
          onPress={() => router.push('/item/new?kind=special_day')}
          accessibilityLabel="Özel gün ekle"
        />
      }>
      <ChipSelect<Filter>
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: 'Tümü' }, ...Object.entries(ALERT_KINDS).map(([k, v]) => ({ value: k as UpcomingKind, label: v.label }))]}
      />
      {!isLoading && groups.length === 0 && (
        <EmptyState
          icon={BellRing}
          title="Şimdilik bir şey yok"
          text="Aşağı çekerek yenile ya da kendi özel günlerini (doğum günü, yıldönümü…) ekle."
        />
      )}
      {groups.map(([title, items]) => (
        <View key={title} style={{ gap: 10 }}>
          <Text variant="label" tone="muted">
            {title}
          </Text>
          {items.map((a) => (
            <AlertCard key={a.key} a={a} />
          ))}
        </View>
      ))}
      <Text variant="caption" tone="subtle">
        Dini günler Ümmü’l-Kurâ takvimine göre hesaplanır; Diyanet takvimiyle ±1 gün fark olabilir.
      </Text>
    </Screen>
  );
}

function AlertCard({ a }: { a: Upcoming }) {
  const { c, accent } = useTheme();
  const k = ALERT_KINDS[a.kind];
  const ac = accent(k.accent);
  const left = daysBetween(new Date(), a.date);
  const onPress = a.itemId ? () => router.push(`/item/${a.itemId}`) : a.url ? () => WebBrowser.openBrowserAsync(a.url!) : undefined;
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', gap: 12 }}>
      <IconTile icon={k.icon} color={ac.strong} bg={ac.soft} size={42} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyMedium">{a.title}</Text>
        {a.body && (
          <Text variant="caption" tone="muted" numberOfLines={a.kind === 'news' ? 4 : 2}>
            {a.body}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <Badge label={fmt(a.date, 'd MMM EEE')} />
          {a.end && <Badge label={`→ ${fmt(a.end, 'd MMM')}`} />}
          {a.kind !== 'news' && left >= 0 && <Badge label={left === 0 ? 'Bugün' : `${left} gün kaldı`} bg={ac.soft} color={ac.strong} />}
          {a.importance >= 3 && <Badge label="Önemli" bg={c.dangerSoft} color={c.danger} />}
        </View>
      </View>
      {a.url && <ExternalLink size={16} color={c.textSubtle} />}
    </Card>
  );
}
