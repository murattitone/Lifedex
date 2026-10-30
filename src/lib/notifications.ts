import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, dayKey, nextYearly } from './date';
import { supabase } from './supabase';

// Local notifications: reminders, cooking alarms, water/reading reminders and important days.
// Everything is rescheduled from the database, so the device never keeps stale reminders.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MAX_SCHEDULED = 60; // iOS keeps at most 64 pending notifications

export async function ensureNotificationSetup() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Hatırlatıcılar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarmlar',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      sound: 'default',
      bypassDnd: false,
    });
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Su & okuma',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type Planned = { id: string; title: string; body?: string; date: Date; channel: string; data?: Record<string, unknown> };

export async function syncNotifications() {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return;
  const granted = await ensureNotificationSetup();
  if (!granted) return;

  const now = new Date();
  const horizon = addDays(now, 45);
  const [{ data: items }, { data: profile }, { data: alerts }, { data: specials }] = await Promise.all([
    supabase
      .from('items')
      .select('id,kind,title,body,remind_at,due_at,data')
      .is('completed_at', null)
      .gte('remind_at', now.toISOString())
      .lte('remind_at', horizon.toISOString())
      .order('remind_at')
      .limit(MAX_SCHEDULED),
    supabase.from('profiles').select('settings').eq('id', session.session.user.id).single(),
    supabase
      .from('alerts')
      .select('id,title,body,starts_on,importance,kind')
      .gte('starts_on', dayKey(now))
      .lte('starts_on', dayKey(horizon))
      .gte('importance', 2)
      .neq('kind', 'news')
      .order('starts_on')
      .limit(20),
    supabase.from('items').select('id,title,body,due_at,data').eq('kind', 'special_day').not('due_at', 'is', null),
  ]);
  const settings = profile?.settings ?? {};

  const planned: Planned[] = [];
  // Yearly personal days: schedule the next occurrence (the stored remind_at may be in a past year)
  const yearly = new Set<string>();
  for (const s of specials ?? []) {
    if (!s.data?.yearly) continue;
    yearly.add(s.id);
    const offset = Number(s.data?.remind_offset ?? 1440);
    if (offset < 0) continue;
    const next = nextYearly(dayKey(new Date(s.due_at)));
    const at = new Date(next.getFullYear(), next.getMonth(), next.getDate(), 9, 0);
    const when = new Date(at.getTime() - offset * 60000);
    if (when > now && when < horizon) {
      planned.push({
        id: `item-${s.id}`,
        title: `🎉 ${s.title}`,
        body: offset ? 'Yaklaşıyor' : 'Bugün!',
        date: when,
        channel: 'reminders',
        data: { url: '/alerts' },
      });
    }
  }
  for (const it of items ?? []) {
    if (yearly.has(it.id)) continue;
    const isAlarm = it.kind === 'meal_plan' || it.data?.alarm;
    planned.push({
      id: `item-${it.id}`,
      title: isAlarm ? `⏰ ${it.title}` : it.title,
      body: it.kind === 'meal_plan' ? 'Yemek yapma zamanı' : it.body?.slice(0, 120) || 'Hatırlatıcı',
      date: new Date(it.remind_at),
      channel: isAlarm ? 'alarms' : 'reminders',
      data: { url: `/item/${it.id}` },
    });
  }
  if (settings.alert_notifications !== false) {
    for (const a of alerts ?? []) {
      const [y, m, d] = a.starts_on.split('-').map(Number);
      const on = new Date(y, m - 1, d, 9, 30);
      if (on > now)
        planned.push({
          id: `alert-${a.id}`,
          title: a.title,
          body: a.body ?? 'Bugün önemli bir gün',
          date: on,
          channel: 'reminders',
          data: { url: '/alerts' },
        });
      if (a.importance >= 3) {
        const before = new Date(y, m - 1, d - 1, 20, 0);
        if (before > now)
          planned.push({
            id: `alert-pre-${a.id}`,
            title: `Yarın: ${a.title}`,
            body: a.body ?? undefined,
            date: before,
            channel: 'reminders',
            data: { url: '/alerts' },
          });
      }
    }
  }
  planned.sort((a, b) => a.date.getTime() - b.date.getTime());

  await Notifications.cancelAllScheduledNotificationsAsync();

  // Daily repeating habits
  const habits: Promise<string>[] = [];
  const water = settings.water_reminder;
  if (water?.enabled) {
    for (let h = water.start; h <= water.end; h += Math.max(1, water.every)) {
      habits.push(
        Notifications.scheduleNotificationAsync({
          identifier: `water-${h}`,
          content: { title: '💧 Su zamanı', body: 'Bir bardak su içmeyi unutma.', data: { url: '/trackers' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: 0, channelId: 'habits' },
        }),
      );
    }
  }
  const reading = settings.reading_reminder;
  if (reading?.enabled) {
    habits.push(
      Notifications.scheduleNotificationAsync({
        identifier: 'reading',
        content: { title: '📖 Okuma vakti', body: `Bugünkü hedefin ${settings.pages_goal ?? 20} sayfa.`, data: { url: '/trackers' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reading.hour, minute: reading.minute, channelId: 'habits' },
      }),
    );
  }
  await Promise.all(habits);

  const room = MAX_SCHEDULED - habits.length;
  await Promise.all(
    planned.slice(0, Math.max(0, room)).map((p) =>
      Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: p.title, body: p.body, data: p.data, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: p.channel },
      }),
    ),
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function requestNotificationSync() {
  clearTimeout(timer);
  timer = setTimeout(() => syncNotifications().catch((e) => console.warn('notification sync', e)), 1500);
}

export const notificationsSupported = true;
