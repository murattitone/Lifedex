// Scheduled local notifications are a mobile feature; on web the app shows reminders in-app.
export async function ensureNotificationSetup() {
  return false;
}
export async function syncNotifications() {}
export function requestNotificationSync() {}
export const notificationsSupported = false;
