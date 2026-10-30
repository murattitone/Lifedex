import { router, useLocalSearchParams } from 'expo-router';
import { Heart, Plus, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ImagePickerField } from '@/components/images';
import { Button, IconButton } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { ChipSelect, Rating, SwitchRow } from '@/components/ui/misc';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { confirm, notify } from '@/lib/confirm';
import { removeFiles, useDeleteItem, useItem, useSaveItem } from '@/lib/data';
import { font, radius, useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { CORE_KEYS, REMINDER_OPTIONS, kindDef, type Field, type KindDef } from '@/modules/kinds';

type Values = Record<string, any>;

function toValues(item: Item | undefined, defaults: Record<string, any> = {}, prefill: Record<string, any> = {}): Values {
  if (!item) return { title: '', tags: '', ...defaults, ...(defaults.data ?? {}), data: undefined, ...prefill };
  return {
    ...item.data,
    title: item.title,
    body: item.body ?? '',
    status: item.status,
    rating: item.rating ?? 0,
    favorite: item.favorite,
    due_at: item.due_at,
    tags: item.tags.join(', '),
  };
}

export default function ItemEditorScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; due?: string; title?: string }>();
  const isNew = params.id === 'new';
  const { data: item, isLoading } = useItem(params.id);
  const def = kindDef(item?.kind ?? params.kind ?? 'note');
  const { c } = useTheme();

  if (!def || (!isNew && !isLoading && !item))
    return (
      <Screen title="Bulunamadı" back>
        {null}
      </Screen>
    );
  if (!isNew && !item)
    return (
      <Screen title={def.label} back>
        <ActivityIndicator color={c.textMuted} />
      </Screen>
    );
  const prefill = { ...(params.due ? { due_at: params.due } : {}), ...(params.title ? { title: params.title } : {}) };
  return <ItemEditor key={item?.id ?? 'new'} def={def} item={item} initial={item ? toValues(item) : toValues(undefined, def.defaults, prefill)} />;
}

function ItemEditor({ def, item, initial }: { def: KindDef; item?: Item; initial: Values }) {
  const isNew = !item;
  const save = useSaveItem();
  const del = useDeleteItem();
  const { c } = useTheme();
  const [values, setValues] = useState<Values>(initial);

  const set = (key: string, v: unknown) => setValues((s) => ({ ...s, [key]: v }));

  const submit = async () => {
    if (!String(values.title ?? '').trim()) return notify('Başlık gerekli');
    const data: Record<string, unknown> = { ...(item?.data ?? {}) };
    for (const f of def.fields) if (!(CORE_KEYS as readonly string[]).includes(f.key)) data[f.key] = values[f.key];
    const offset = Number(values.remind_offset ?? -1);
    const due = values.due_at ? new Date(values.due_at) : null;
    const remind_at = due && offset >= 0 ? new Date(due.getTime() - offset * 60000).toISOString() : null;
    try {
      await save.mutateAsync({
        id: item?.id,
        module: def.module,
        kind: def.kind,
        title: String(values.title).trim(),
        body: values.body || null,
        status: values.status ?? item?.status ?? null,
        rating: values.rating || null,
        favorite: !!values.favorite,
        due_at: values.due_at ?? null,
        remind_at: def.fields.some((f) => f.type === 'reminder') ? remind_at : (item?.remind_at ?? null),
        tags: String(values.tags ?? '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        data,
      });
      router.back();
    } catch (e) {
      notify('Kaydedilemedi', (e as Error).message);
    }
  };

  const remove = async () => {
    if (!item || !(await confirm('Silinsin mi?', `"${item.title}" kalıcı olarak silinecek.`))) return;
    await removeFiles(item.data?.images ?? []);
    await del.mutateAsync(item.id);
    router.back();
  };

  return (
    <Screen
      title={isNew ? `Yeni ${def.label.toLowerCase()}` : def.label}
      back
      right={
        def.favorite ? (
          <IconButton
            icon={Heart}
            variant="ghost"
            color={values.favorite ? c.danger : c.textMuted}
            accessibilityLabel="Favori"
            onPress={() => set('favorite', !values.favorite)}
          />
        ) : undefined
      }
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!isNew && <IconButton icon={Trash2} variant="destructive" size={46} onPress={remove} accessibilityLabel="Sil" />}
          <Button title="Kaydet" onPress={submit} loading={save.isPending} style={{ flex: 1 }} />
        </View>
      }>
      {def.fields.map((f) => (
        <FieldInput key={f.key} field={f} value={values[f.key]} values={values} onChange={(v) => set(f.key, v)} />
      ))}
    </Screen>
  );
}

function FieldInput({ field: f, value, values, onChange }: { field: Field; value: any; values: Values; onChange: (v: any) => void }) {
  const { c } = useTheme();
  switch (f.type) {
    case 'text':
      return (
        <Input
          label={f.label}
          placeholder={f.placeholder}
          value={value ?? ''}
          onChangeText={onChange}
          autoFocus={f.key === 'title' && !values.title}
        />
      );
    case 'textarea':
      return <Input label={f.label} placeholder={f.placeholder} value={value ?? ''} onChangeText={onChange} multiline />;
    case 'tags':
      return <Input label={f.label} placeholder={f.placeholder} value={value ?? ''} onChangeText={onChange} autoCapitalize="none" />;
    case 'number':
      return (
        <Input
          label={f.label}
          placeholder={f.placeholder ?? '0'}
          keyboardType="decimal-pad"
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={(t) => {
            const n = parseFloat(t.replace(',', '.'));
            onChange(t === '' ? null : Number.isNaN(n) ? value : n);
          }}
        />
      );
    case 'select':
      return (
        <Labeled label={f.label}>
          <ChipSelect options={f.options ?? []} value={value} onChange={onChange} />
        </Labeled>
      );
    case 'reminder':
      return (
        <Labeled label={f.label}>
          <ChipSelect options={REMINDER_OPTIONS} value={String(value ?? '-1')} onChange={onChange} />
          {!values.due_at && Number(value ?? -1) >= 0 && (
            <Text variant="caption" tone="subtle">
              Hatırlatma için bir tarih seç.
            </Text>
          )}
        </Labeled>
      );
    case 'rating':
      return (
        <Labeled label={f.label}>
          <Rating value={Number(value ?? 0)} onChange={onChange} size={28} />
        </Labeled>
      );
    case 'score':
      return (
        <Labeled label={f.label}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = Number(value) === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => onChange(n)}
                  style={[styles.score, { borderColor: active ? c.text : c.border, backgroundColor: active ? c.text : c.surface }]}>
                  <Text variant="label" style={{ fontFamily: font.semibold }} color={active ? c.background : c.textMuted}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Labeled>
      );
    case 'date':
      return <DateField label={f.label} value={value} onChange={onChange} withTime={false} />;
    case 'datetime':
      return <DateField label={f.label} value={value} onChange={onChange} />;
    case 'toggle':
      return <SwitchRow label={f.label} value={!!value} onChange={onChange} />;
    case 'images':
      return (
        <Labeled label={f.label}>
          <ImagePickerField value={value ?? []} onChange={onChange} />
        </Labeled>
      );
    case 'list':
      return <ListField label={f.label} placeholder={f.placeholder} value={value ?? []} onChange={onChange} />;
  }
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function ListField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { c } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...value, t]);
    setDraft('');
  };
  return (
    <Labeled label={label}>
      {value.map((v, i) => (
        <View key={`${v}-${i}`} style={[styles.listRow, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={[styles.bullet, { backgroundColor: c.primary }]} />
          <Text style={{ flex: 1 }}>{v}</Text>
          <Pressable hitSlop={8} onPress={() => onChange(value.filter((_, j) => j !== i))} accessibilityLabel="Kaldır">
            <X size={16} color={c.textSubtle} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input placeholder={placeholder} value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false} />
        </View>
        <IconButton icon={Plus} variant="secondary" size={48} onPress={add} accessibilityLabel="Ekle" />
      </View>
    </Labeled>
  );
}

const styles = StyleSheet.create({
  score: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 44, borderRadius: radius.md, borderWidth: 1 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
});
