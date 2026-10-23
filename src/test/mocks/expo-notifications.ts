import { vi } from 'vitest';

export const setNotificationHandler = vi.fn();
export const getPermissionsAsync = vi.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = vi.fn().mockResolvedValue({ status: 'granted' });
export const setNotificationChannelAsync = vi.fn().mockResolvedValue(null);
export const setNotificationCategoryAsync = vi.fn().mockResolvedValue(null);
export const cancelAllScheduledNotificationsAsync = vi.fn().mockResolvedValue(null);
export const scheduleNotificationAsync = vi.fn().mockResolvedValue('notif-id-123');
export const addNotificationResponseReceivedListener = vi.fn().mockReturnValue({ remove: vi.fn() });

export const AndroidImportance = {
  MAX: 5,
};

const NotificationsMock = {
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationCategoryAsync,
  cancelAllScheduledNotificationsAsync,
  scheduleNotificationAsync,
  addNotificationResponseReceivedListener,
  AndroidImportance,
};

export default NotificationsMock;
