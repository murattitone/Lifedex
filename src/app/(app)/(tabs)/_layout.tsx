import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { font, radius, useTheme } from '@/lib/theme';

const LABELS = { index: 'Bugün', plan: 'Plan', alerts: 'Önemli', me: 'Ben' } as const;

/** Flat, typographic tab bar: labels instead of icon bubbles, the active tab marked by an ink rule. */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => r.name in LABELS);

  const tab = (route: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => {
          haptic();
          if (!focused) navigateToTab(route.key);
        }}
        style={styles.tab}>
        <View style={[styles.marker, { backgroundColor: focused ? c.text : 'transparent' }]} />
        <Text variant="label" style={{ fontFamily: focused ? font.bold : font.medium, fontSize: 13.5 }} color={focused ? c.text : c.textSubtle}>
          {LABELS[route.name as keyof typeof LABELS]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { backgroundColor: c.dock, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.inner}>
        {routes.slice(0, 2).map(tab)}
        <View style={styles.tab}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hızlı ekle"
            onPress={() => {
              haptic('medium');
              router.push('/add');
            }}
            style={({ pressed }) => [styles.add, { backgroundColor: c.primary }, pressed && { opacity: 0.8 }]}>
            <Plus size={22} color={c.primaryText} strokeWidth={2.2} />
          </Pressable>
        </View>
        {routes.slice(2).map(tab)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1 },
  inner: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 56, gap: 8 },
  marker: { position: 'absolute', top: -1, width: 28, height: 2 },
  add: { width: 46, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
