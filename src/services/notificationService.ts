import * as Notifications from 'expo-notifications';

// Local notifications for reminders, missed-checkin warnings, and fake-call
// triggers (FR-27, FR-31, FR-39, FR-56). Push is out of scope for MVP.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleCheckIn(minutes: number): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: { title: 'Time to check in', body: 'Tap to confirm you are okay.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
    });
  },

  async scheduleFakeCall(seconds: number, caller: string): Promise<string> {
    if (seconds <= 0) return '';
    return Notifications.scheduleNotificationAsync({
      content: { title: `${caller} is calling…`, body: 'Incoming call' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  },

  async cancel(id: string): Promise<void> {
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
