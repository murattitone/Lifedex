import { router } from 'expo-router';
import { ArrowRight, Lightbulb, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, ChipSelect, EmptyState, Progress } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useItems } from '@/lib/data';
import { fromNow } from '@/lib/date';
import { font, useTheme } from '@/lib/theme';
import { IDEA_STATUS, ideaScore } from '@/modules/kinds';

export default function Ideas() {
  const { c, accent } = useTheme();
  const ideas = useItems({ kind: 'idea', order: 'updated' });
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'score' | 'recent'>('score');
  const [q, setQ] = useState('');
  const amber = accent('amber');

  const list = useMemo(() => {
    const l = (ideas.data ?? []).filter(
      (i) =>
        (status === 'all' || i.status === status) &&
        (!q || `${i.title} ${i.body ?? ''} ${i.data?.evaluation ?? ''}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))),
    );
    return sort === 'score' ? [...l].sort((a, b) => ideaScore(b.data) - ideaScore(a.data)) : l;
  }, [ideas.data, status, sort, q]);

  return (
    <Screen
      title="Fikirler"
      subtitle="Üretim, iş ve proje fikirlerin"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push('/item/new?kind=idea')} accessibilityLabel="Fikir ekle" />}>
      <Input value={q} onChangeText={setQ} placeholder="Fikirlerde ara…" />
      <ChipSelect value={status} onChange={setStatus} options={[{ value: 'all', label: 'Tümü' }, ...IDEA_STATUS]} />
      <ChipSelect
        value={sort}
        onChange={setSort}
        options={[
          { value: 'score', label: 'En umut verici' },
          { value: 'recent', label: 'En yeni' },
        ]}
      />
      {!ideas.isLoading && !list.length && (
        <EmptyState
          icon={Lightbulb}
          title="Fikir kutusu boş"
          text="Aklına geleni hemen yaz; potansiyel, efor ve heyecanını puanla, sonra değerlendir."
        />
      )}
      {list.map((i) => {
        const score = ideaScore(i.data);
        const st = IDEA_STATUS.find((s) => s.value === i.status)?.label ?? 'Yeni';
        return (
          <Card key={i.id} onPress={() => router.push(`/item/${i.id}`)} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyMedium">{i.title}</Text>
                {i.body ? (
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {i.body}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'center', backgroundColor: amber.soft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text variant="heading" color={amber.strong}>
                  {score}
                </Text>
                <Text variant="caption" color={amber.strong}>
                  puan
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                ['Potansiyel', i.data?.potential, c.success],
                ['Efor', i.data?.effort, c.warning],
                ['Heyecan', i.data?.excitement, c.primary],
              ].map(([label, v, color]) => (
                <View key={label as string} style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption" tone="subtle">
                    {label as string}
                  </Text>
                  <Progress value={(Number(v) || 0) / 5} color={color as string} height={5} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={st} bg={amber.soft} color={amber.strong} />
              {i.tags.slice(0, 2).map((t) => (
                <Badge key={t} label={t} />
              ))}
              <View style={{ flex: 1 }} />
              <Text variant="caption" tone="subtle">
                {fromNow(i.updated_at)}
              </Text>
            </View>
            {i.data?.next_step ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ArrowRight size={14} color={c.textMuted} />
                <Text variant="caption" style={{ fontFamily: font.medium, flex: 1 }} numberOfLines={1}>
                  {i.data.next_step}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
