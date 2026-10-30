import { router } from 'expo-router';
import { BookMarked, Clapperboard, Heart, Plus, Tv } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, ChipSelect, EmptyState, IconTile, Progress, Rating, Segmented } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useItems } from '@/lib/data';
import { useTheme } from '@/lib/theme';

type Kind = 'book' | 'movie' | 'series';
type Status = 'all' | 'wishlist' | 'in_progress' | 'done' | 'fav';

const META = {
  book: { label: 'Kitap', icon: BookMarked, progress: 'Okunuyor', done: 'Okundu' },
  movie: { label: 'Film', icon: Clapperboard, progress: '', done: 'İzlendi' },
  series: { label: 'Dizi', icon: Tv, progress: 'İzleniyor', done: 'Bitti' },
};

export default function Growth() {
  const { c, accent } = useTheme();
  const [kind, setKind] = useState<Kind>('book');
  const [status, setStatus] = useState<Status>('all');
  const items = useItems({ kind: ['book', 'movie', 'series'], order: 'updated' });
  const violet = accent('violet');
  const meta = META[kind];

  const ofKind = useMemo(() => (items.data ?? []).filter((i) => i.kind === kind), [items.data, kind]);
  const list = ofKind.filter((i) => status === 'all' || (status === 'fav' ? i.favorite : i.status === status));
  const year = new Date().getFullYear();
  const doneThisYear = ofKind.filter((i) => i.status === 'done' && new Date(i.updated_at).getFullYear() === year).length;
  const wish = ofKind.filter((i) => i.status === 'wishlist').length;

  const statusOptions = [
    { value: 'all' as Status, label: 'Tümü' },
    { value: 'wishlist' as Status, label: 'İstek listesi' },
    ...(meta.progress ? [{ value: 'in_progress' as Status, label: meta.progress }] : []),
    { value: 'done' as Status, label: meta.done },
    { value: 'fav' as Status, label: 'Favoriler', icon: Heart },
  ];

  return (
    <Screen
      title="Gelişim"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push(`/item/new?kind=${kind}`)} accessibilityLabel="Ekle" />}>
      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k);
          setStatus('all');
        }}
        options={[
          { value: 'book', label: 'Kitaplar' },
          { value: 'movie', label: 'Filmler' },
          { value: 'series', label: 'Diziler' },
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card tint={violet.soft} style={{ flex: 1, gap: 2 }}>
          <Text variant="stat" color={violet.strong}>
            {doneThisYear}
          </Text>
          <Text variant="caption" tone="muted">
            {year} yılında {meta.done.toLowerCase()}
          </Text>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <Text variant="stat">{wish}</Text>
          <Text variant="caption" tone="muted">
            İstek listesinde
          </Text>
        </Card>
      </View>
      <ChipSelect value={status} onChange={setStatus} options={statusOptions} />
      {!items.isLoading && !list.length && (
        <EmptyState
          icon={meta.icon}
          title={`${meta.label} yok`}
          text="Okumak / izlemek istediklerini istek listesine ekle; bitirince puan ver ve notunu yaz."
        />
      )}
      {list.map((i) => {
        const pct = i.kind === 'book' && i.data?.total_pages ? (Number(i.data.current_page) || 0) / Number(i.data.total_pages) : null;
        const statusLabel = i.status === 'done' ? meta.done : i.status === 'in_progress' ? meta.progress : 'İstek listesi';
        return (
          <Card key={i.id} onPress={() => router.push(`/item/${i.id}`)} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <IconTile icon={meta.icon} color={violet.strong} bg={violet.soft} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {i.title}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {[i.data?.creator, i.data?.year, i.data?.progress].filter(Boolean).join(' · ') || statusLabel}
                </Text>
              </View>
              {i.favorite && <Heart size={16} color={c.danger} fill={c.danger} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge label={statusLabel} bg={i.status === 'done' ? c.successSoft : undefined} color={i.status === 'done' ? c.success : undefined} />
              <View style={{ flex: 1 }} />
              {!!i.rating && <Rating value={i.rating} size={14} />}
            </View>
            {pct !== null && (
              <View style={{ gap: 4 }}>
                <Progress value={pct} color={violet.strong} height={6} />
                <Text variant="caption" tone="subtle">
                  {i.data.current_page || 0} / {i.data.total_pages} sayfa
                </Text>
              </View>
            )}
            {i.body ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {i.body}
              </Text>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
