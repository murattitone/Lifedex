import { router } from 'expo-router';
import { Compass, Heart, Plus, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ImageStrip } from '@/components/images';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChipSelect, EmptyState, IconTile } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useItems } from '@/lib/data';
import { font, useTheme } from '@/lib/theme';

export default function Faith() {
  const { c, accent } = useTheme();
  const verses = useItems({ kind: 'verse', order: 'updated' });
  const [filter, setFilter] = useState<'all' | 'fav'>('all');
  const [q, setQ] = useState('');
  const teal = accent('teal');

  const list = useMemo(
    () =>
      (verses.data ?? []).filter(
        (v) =>
          (filter === 'all' || v.favorite) &&
          (!q || `${v.title} ${v.body ?? ''} ${v.data?.note ?? ''} ${v.tags.join(' ')}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))),
      ),
    [verses.data, filter, q],
  );

  return (
    <Screen
      title="İbadet"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push('/item/new?kind=verse')} accessibilityLabel="Ayet ekle" />}>
      <Card tint={teal.soft} onPress={() => router.push('/faith/qibla')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <IconTile icon={Compass} color="#fff" bg={teal.strong} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">Kıble pusulası</Text>
          <Text variant="caption" tone="muted">
            Konumuna göre Kâbe yönünü gösterir
          </Text>
        </View>
      </Card>

      <Input value={q} onChangeText={setQ} placeholder="Ayet, meal veya not ara…" />
      <ChipSelect
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tümü' },
          { value: 'fav', label: 'Favoriler', icon: Heart },
        ]}
      />

      {!verses.isLoading && !list.length && (
        <EmptyState icon={Sparkles} title="Henüz ayet yok" text="Sevdiğin ayetleri mealleri, notların ve ekran görüntüleriyle sakla." />
      )}
      {list.map((v) => (
        <Card key={v.id} onPress={() => router.push(`/item/${v.id}`)} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="label" color={teal.strong} style={{ flex: 1, fontFamily: font.semibold }}>
              {v.title}
            </Text>
            {v.favorite && <Heart size={16} color={c.danger} fill={c.danger} />}
          </View>
          {v.data?.arabic ? <Text style={{ fontSize: 22, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl' }}>{v.data.arabic}</Text> : null}
          {v.body ? (
            <Text tone="default" numberOfLines={5}>
              {v.body}
            </Text>
          ) : null}
          {v.data?.note ? (
            <Text variant="caption" tone="muted" style={{ fontStyle: 'italic' }} numberOfLines={3}>
              “{v.data.note}”
            </Text>
          ) : null}
          <ImageStrip paths={v.data?.images ?? []} size={84} />
        </Card>
      ))}
    </Screen>
  );
}
