import { router } from 'expo-router';
import { AlarmClock, ChefHat, Clock3, CookingPot, Heart, ListPlus, Plus, ShoppingBasket, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ImageStrip } from '@/components/images';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, Checkbox, ChipSelect, EmptyState, IconTile, Segmented } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { confirm, notify } from '@/lib/confirm';
import { useDeleteItem, useItems, useSaveItem, useToggleDone } from '@/lib/data';
import { relativeDateTime, startOfDay } from '@/lib/date';
import { useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { SHOPPING_CATEGORIES } from '@/modules/kinds';

type Tab = 'shopping' | 'recipes' | 'plan';

export default function Kitchen() {
  const [tab, setTab] = useState<Tab>('shopping');
  const newKind = { shopping: 'shopping', recipes: 'recipe', plan: 'meal_plan' }[tab];
  return (
    <Screen
      title="Mutfak"
      back
      right={<IconButton icon={Plus} variant="primary" onPress={() => router.push(`/item/new?kind=${newKind}`)} accessibilityLabel="Ekle" />}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'shopping', label: 'Alışveriş' },
          { value: 'recipes', label: 'Tarifler' },
          { value: 'plan', label: 'Plan' },
        ]}
      />
      {tab === 'shopping' && <Shopping />}
      {tab === 'recipes' && <Recipes />}
      {tab === 'plan' && <MealPlan />}
    </Screen>
  );
}

function Shopping() {
  const { c } = useTheme();
  const items = useItems({ kind: 'shopping', order: 'created' });
  const save = useSaveItem();
  const del = useDeleteItem();
  const toggle = useToggleDone();
  const [draft, setDraft] = useState('');

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    save.mutate({ module: 'kitchen', kind: 'shopping', title, status: 'todo', data: { category: 'diger' } });
    setDraft('');
  };

  const open = (items.data ?? []).filter((i) => !i.completed_at);
  const done = (items.data ?? []).filter((i) => i.completed_at);
  const grouped = SHOPPING_CATEGORIES.map((cat) => [cat.label, open.filter((i) => (i.data?.category ?? 'diger') === cat.value)] as const).filter(
    ([, l]) => l.length,
  );

  const clearDone = async () => {
    if (!(await confirm('Alınanlar temizlensin mi?', `${done.length} ürün listeden kaldırılacak.`, 'Temizle'))) return;
    for (const i of done) await del.mutateAsync(i.id);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input value={draft} onChangeText={setDraft} placeholder="Ürün ekle (ör. 2 kg domates)" onSubmitEditing={add} returnKeyType="done" />
        </View>
        <IconButton icon={Plus} variant="secondary" size={48} onPress={add} accessibilityLabel="Ekle" />
      </View>
      {!items.isLoading && !items.data?.length && (
        <EmptyState icon={ShoppingBasket} title="Liste boş" text="Aklına geleni hemen ekle; markette reyon reyon işaretle." />
      )}
      {grouped.map(([label, list]) => (
        <View key={label} style={{ gap: 6 }}>
          <Text variant="label" tone="muted">
            {label}
          </Text>
          <Card padded={false} style={{ paddingHorizontal: 14 }}>
            {list.map((i) => (
              <ShoppingRow key={i.id} item={i} onToggle={() => toggle(i)} />
            ))}
          </Card>
        </View>
      ))}
      {done.length > 0 && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" tone="muted">
              Alındı · {done.length}
            </Text>
            <Pressable onPress={clearDone}>
              <Text variant="label" tone="danger">
                Temizle
              </Text>
            </Pressable>
          </View>
          <Card padded={false} style={{ paddingHorizontal: 14, opacity: 0.7 }}>
            {done.map((i) => (
              <ShoppingRow key={i.id} item={i} onToggle={() => toggle(i)} />
            ))}
          </Card>
        </View>
      )}
      <Text variant="caption" tone="subtle" style={{ color: c.textSubtle }}>
        Reyonu değiştirmek için ürüne dokun.
      </Text>
    </>
  );
}

function ShoppingRow({ item, onToggle }: { item: Item; onToggle: () => void }) {
  const done = !!item.completed_at;
  return (
    <Pressable onPress={() => router.push(`/item/${item.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
      <Checkbox checked={done} onPress={onToggle} />
      <Text style={[{ flex: 1 }, done && { textDecorationLine: 'line-through' }]} tone={done ? 'subtle' : 'default'}>
        {item.title}
      </Text>
      {item.data?.qty ? (
        <Text variant="caption" tone="muted">
          {item.data.qty}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Recipes() {
  const { c, accent } = useTheme();
  const recipes = useItems({ kind: 'recipe', order: 'updated' });
  const save = useSaveItem();
  const [filter, setFilter] = useState<'all' | 'fav'>('all');
  const [q, setQ] = useState('');
  const orange = accent('orange');

  const list = useMemo(
    () =>
      (recipes.data ?? []).filter(
        (r) =>
          (filter === 'all' || r.favorite) &&
          (!q ||
            `${r.title} ${r.tags.join(' ')} ${(r.data?.ingredients ?? []).join(' ')}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))),
      ),
    [recipes.data, filter, q],
  );

  const toList = async (r: Item) => {
    const ings: string[] = r.data?.ingredients ?? [];
    if (!ings.length) return notify('Bu tarifte malzeme yok');
    for (const title of ings)
      await save.mutateAsync({ module: 'kitchen', kind: 'shopping', title, status: 'todo', data: { category: 'diger', recipe_id: r.id } });
    notify('Listeye eklendi', `${ings.length} malzeme alışveriş listende.`);
  };

  return (
    <>
      <Input value={q} onChangeText={setQ} placeholder="Tarif veya malzeme ara…" />
      <ChipSelect
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tümü' },
          { value: 'fav', label: 'Favoriler', icon: Heart },
        ]}
      />
      {!recipes.isLoading && !list.length && (
        <EmptyState icon={ChefHat} title="Tarif yok" text="Sevdiğin tarifleri malzemeleri ve fotoğraflarıyla kaydet." />
      )}
      {list.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/item/${r.id}`)} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={ChefHat} color={orange.strong} bg={orange.soft} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyMedium">{r.title}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {r.data?.duration ? <Badge icon={Clock3} label={`${r.data.duration} dk`} /> : null}
                {r.data?.servings ? <Badge icon={Users} label={`${r.data.servings} kişilik`} /> : null}
                {r.tags.slice(0, 2).map((t) => (
                  <Badge key={t} label={t} />
                ))}
              </View>
            </View>
            <IconButton
              icon={Heart}
              variant="ghost"
              size={36}
              color={r.favorite ? c.danger : c.textSubtle}
              onPress={() => save.mutate({ id: r.id, module: r.module, kind: r.kind, favorite: !r.favorite })}
              accessibilityLabel="Favori"
            />
          </View>
          <ImageStrip paths={r.data?.images ?? []} size={72} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Malzemeleri listeye ekle" icon={ListPlus} size="sm" variant="outline" onPress={() => toList(r)} style={{ flex: 1 }} />
            <Button
              title="Planla"
              icon={CookingPot}
              size="sm"
              variant="secondary"
              onPress={() => router.push(`/item/new?kind=meal_plan&title=${encodeURIComponent(r.title)}`)}
            />
          </View>
        </Card>
      ))}
    </>
  );
}

function MealPlan() {
  const { accent } = useTheme();
  const plans = useItems({ kind: 'meal_plan', order: 'due' });
  const now = startOfDay();
  const upcoming = (plans.data ?? []).filter((p) => !p.due_at || new Date(p.due_at) >= now);
  const past = (plans.data ?? [])
    .filter((p) => p.due_at && new Date(p.due_at) < now)
    .slice(-5)
    .reverse();
  const orange = accent('orange');
  const row = (p: Item) => (
    <Card key={p.id} onPress={() => router.push(`/item/${p.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconTile icon={CookingPot} color={orange.strong} bg={orange.soft} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{p.title}</Text>
        <Text variant="caption" tone="muted">
          {p.due_at ? relativeDateTime(p.due_at) : 'Tarih yok'}
        </Text>
      </View>
      {p.remind_at && <AlarmClock size={18} color={orange.strong} />}
    </Card>
  );
  return (
    <>
      {!plans.isLoading && !upcoming.length && (
        <EmptyState
          icon={CookingPot}
          title="Planlanmış yemek yok"
          text="Yemek yapacağın günü seç; o saatte alarm çalsın."
          action={<Button title="Yemek planla" size="sm" variant="secondary" onPress={() => router.push('/item/new?kind=meal_plan')} />}
        />
      )}
      {upcoming.map(row)}
      {past.length > 0 && (
        <>
          <Text variant="label" tone="muted">
            Geçmiş
          </Text>
          {past.map(row)}
        </>
      )}
    </>
  );
}
