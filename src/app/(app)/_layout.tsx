import * as Notifications from 'expo-notifications';
import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/lib/auth';
import { refreshAlerts } from '@/lib/data';
import { syncNotifications } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';

export default function AppLayout() {
  const { session } = useAuth();
  const { c } = useTheme();

  useEffect(() => {
    if (!session) return;
    refreshAlerts().finally(() => syncNotifications().catch(() => {}));
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const url = res.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as any);
    });
    return () => sub.remove();
  }, [session]);

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}
