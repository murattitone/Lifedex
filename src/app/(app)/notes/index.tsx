import { router } from 'expo-router';
import { Heart, NotebookPen, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useItems } from '@/lib/data';
import { fromNow } from '@/lib/date';
import { useTheme } from '@/lib/theme';

export default function Notes() {
  const { c } = useTheme();
  const notes = useItems({ kind: 'note', order: 'updated' });
  const [q, setQ] = useState('');
  const list = (notes.data ?? []).filter(
    (n) => !q || `${n.title} ${n.body ?? ''} ${n.tags.join(' ')}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')),
  );
  return (
    <Screen
      title="Notlar"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push('/item/new?kind=note')} accessibilityLabel="Not ekle" />}>
      <Input value={q} onChangeText={setQ} placeholder="Notlarda ara…" />
      {!notes.isLoading && !list.length && <EmptyState icon={NotebookPen} title="Not yok" text="Kendine dair her şeyi buraya yaz." />}
      {list.map((n) => (
        <Card key={n.id} onPress={() => router.push(`/item/${n.id}`)} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
              {n.title}
            </Text>
            {n.favorite && <Heart size={14} color={c.danger} fill={c.danger} />}
          </View>
          {n.body ? (
            <Text variant="caption" tone="muted" numberOfLines={3}>
              {n.body}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {n.tags.slice(0, 3).map((t) => (
              <Badge key={t} label={t} />
            ))}
            <View style={{ flex: 1 }} />
            <Text variant="caption" tone="subtle">
              {fromNow(n.updated_at)}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
