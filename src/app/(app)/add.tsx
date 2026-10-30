import { router } from 'expo-router';
import { Dumbbell, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, IconButton } from '@/components/ui/button';
import { IconTile } from '@/components/ui/misc';
import { Text } from '@/components/ui/text';
import { useAddLog } from '@/lib/data';
import { radius, useTheme } from '@/lib/theme';
import { TRACKERS, formatAmount } from '@/lib/trackers';
import { KINDS } from '@/modules/kinds';

const ORDER = ['task', 'note', 'shopping', 'meal_plan', 'recipe', 'idea', 'book', 'movie', 'series', 'verse', 'goal', 'special_day'];

export default function QuickAdd() {
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const addLog = useAddLog();
  const kinds = ORDER.map((k) => KINDS.find((d) => d.kind === k)!).filter(Boolean);

  const open = (href: string) => {
    router.back();
    setTimeout(() => router.push(href as any), 60);
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => router.back()} />
      <View style={styles.anchor} pointerEvents="box-none">
        <View style={[styles.panel, { backgroundColor: c.background, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.head}>
            <Text variant="title">Hızlı ekle</Text>
            <IconButton icon={X} onPress={() => router.back()} accessibilityLabel="Kapat" />
          </View>

          <View style={styles.trackers}>
            {TRACKERS.map((t) => {
              const a = accent(t.accent);
              const amount = t.quick[1];
              return (
                <Pressable
                  key={t.kind}
                  onPress={() => {
                    haptic('success');
                    addLog.mutate({ kind: t.kind, amount, unit: t.unit });
                    router.back();
                  }}
                  style={[styles.tracker, { backgroundColor: a.soft }]}>
                  <t.icon size={18} color={a.strong} />
                  <Text variant="label" color={a.strong}>
                    +{formatAmount(amount, t.unit)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.grid}>
            <Tile label="Antrenman" icon={Dumbbell} a={accent('blue')} onPress={() => open('/fitness/workout')} />
            {kinds.map((k) => (
              <Tile key={k.kind} label={k.label} icon={k.icon} a={accent(k.accent)} onPress={() => open(`/item/new?kind=${k.kind}`)} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function Tile({ label, icon, a, onPress }: { label: string; icon: any; a: { soft: string; strong: string }; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.8 }]}>
      <IconTile icon={icon} color={a.strong} bg={a.soft} size={38} />
      <Text variant="label" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    gap: 16,
    maxWidth: 640,
    width: '100%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackers: { flexDirection: 'row', gap: 8 },
  tracker: { flex: 1, height: 46, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '30.8%', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1 },
});
