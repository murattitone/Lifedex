import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { BellRing, CalendarCheck, House, Plus, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';

const ICONS = { index: House, plan: CalendarCheck, alerts: BellRing, me: UserRound } as const;
const LABELS = { index: 'Ana sayfa', plan: 'Planlayıcı', alerts: 'Önemli', me: 'Profil' } as const;

function Dock({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => r.name in ICONS);
  const buttons = routes.map((route) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const Icon = ICONS[route.name as keyof typeof ICONS];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={LABELS[route.name as keyof typeof LABELS]}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          haptic();
          if (!focused) navigateToTab(route.key);
        }}
        style={[styles.btn, { backgroundColor: focused ? c.primary : 'rgba(255,255,255,0.08)' }]}>
        <Icon size={20} color={c.dockIcon} strokeWidth={focused ? 2.3 : 1.9} />
      </Pressable>
    );
  });
  const add = (
    <Pressable
      key="add"
      accessibilityRole="button"
      accessibilityLabel="Hızlı ekle"
      onPress={() => {
        haptic('medium');
        router.push('/add');
      }}
      style={[styles.btn, styles.add]}>
      <Plus size={22} color="#0E1014" strokeWidth={2.4} />
    </Pressable>
  );
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 14 }]}>
      <View style={[styles.dock, { backgroundColor: c.dock }]}>
        {buttons.slice(0, 2)}
        {add}
        {buttons.slice(2)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <Dock {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dock: {
    flexDirection: 'row',
    gap: 8,
    padding: 7,
    borderRadius: 999,
    boxShadow: '0 12px 32px rgba(10,12,20,0.28)',
  },
  btn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  add: { backgroundColor: '#FFFFFF' },
});
