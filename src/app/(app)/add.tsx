import { router } from 'expo-router';
import { Dumbbell, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAddLog } from '@/lib/data';
import { font, radius, useTheme } from '@/lib/theme';
import { TRACKERS, formatAmount } from '@/lib/trackers';
import { KINDS } from '@/modules/kinds';

const ORDER = ['task', 'note', 'shopping', 'meal_plan', 'recipe', 'idea', 'book', 'movie', 'series', 'verse', 'goal', 'special_day'];

export default function QuickAdd() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const addLog = useAddLog();
  const entries = [
    { key: 'workout', label: 'Antrenman kaydı', icon: Dumbbell, href: '/fitness/workout' },
    ...ORDER.map((k) => KINDS.find((d) => d.kind === k)!)
      .filter(Boolean)
      .map((k) => ({ key: k.kind, label: k.label, icon: k.icon, href: `/item/new?kind=${k.kind}` })),
  ];

  const open = (href: string) => {
    router.back();
    setTimeout(() => router.push(href as any), 60);
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => router.back()} accessibilityLabel="Kapat" />
      <View style={styles.anchor} pointerEvents="box-none">
        <View style={[styles.panel, { backgroundColor: c.background, paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.head}>
            <Text variant="title">Ne ekliyorsun?</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Kapat">
              <X size={22} color={c.text} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text variant="overline" tone="subtle">
              Tek dokunuşla deftere yaz
            </Text>
            <View style={styles.trackers}>
              {TRACKERS.map((t) => {
                const amount = t.quick[1];
                return (
                  <Pressable
                    key={t.kind}
                    onPress={() => {
                      haptic('success');
                      addLog.mutate({ kind: t.kind, amount, unit: t.unit });
                      router.back();
                    }}
                    style={({ pressed }) => [styles.tracker, { borderColor: c.borderStrong }, pressed && { backgroundColor: c.surfaceMuted }]}>
                    <Text variant="caption" tone="muted">
                      {t.label}
                    </Text>
                    <Text variant="figure">+{formatAmount(amount, t.unit)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.grid, { borderTopColor: c.text }]}>
            {entries.map((e) => (
              <Pressable
                key={e.key}
                onPress={() => {
                  haptic();
                  open(e.href);
                }}
                style={({ pressed }) => [styles.cell, { borderBottomColor: c.border }, pressed && { backgroundColor: c.surfaceMuted }]}>
                <e.icon size={17} color={c.textMuted} strokeWidth={1.7} />
                <Text variant="bodyMedium" style={{ fontFamily: font.medium }} numberOfLines={1}>
                  {e.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 22,
    paddingTop: 22,
    gap: 20,
    maxWidth: 640,
    width: '100%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackers: { flexDirection: 'row', gap: 8 },
  tracker: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1.5 },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingRight: 8, borderBottomWidth: 1 },
});
