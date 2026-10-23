import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(null),
  setNotificationCategoryAsync: vi.fn().mockResolvedValue(null),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(null),
  scheduleNotificationAsync: vi.fn().mockResolvedValue('notif-id-123'),
  addNotificationResponseReceivedListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  AndroidImportance: { MAX: 5 },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import { planStore } from '../../apps/mobile/lib/planStore';
import {
  MAX_PENDING_NOTIFICATIONS,
  DoseNotificationItem,
  scheduleSlidingWindowNotifications,
} from '../../apps/mobile/lib/notifications';
import {
  syncEventsToNativeCalendar,
  CalendarDoseItem,
} from '../../apps/mobile/lib/calendar';
import { TreatmentPlan } from '../../packages/core/src/types';

describe('Mobile Modules (planStore & Native Notification Rules)', () => {
  beforeEach(() => {
    planStore.clear();
    vi.clearAllMocks();
  });

  it('manages draft plan state correctly in planStore', () => {
    const mockPlan: TreatmentPlan = {
      planTitle: 'Tratamento Teste',
      summary: 'Resumo teste',
      items: [
        {
          name: 'Ibuprofeno',
          type: 'medication',
          durationDays: 3,
          frequency: { timesPerDay: 2 },
        },
      ],
    };

    expect(planStore.getState().plan).toBeNull();

    planStore.setDraftPlan(mockPlan, 'base64-image-string');
    const state = planStore.getState();

    expect(state.plan?.planTitle).toBe('Tratamento Teste');
    expect(state.imageBase64).toBe('base64-image-string');

    const newDate = new Date('2026-12-01T10:00:00.000Z');
    planStore.setStartDateTime(newDate);
    expect(planStore.getState().startDateTime).toEqual(newDate);

    planStore.clear();
    expect(planStore.getState().plan).toBeNull();
    expect(planStore.getState().imageBase64).toBeNull();
  });

  it('enforces maximum 50 scheduled notifications to protect iOS 64 limit', async () => {
    // Gerar 70 eventos futuros
    const now = Date.now();
    const mockEvents: DoseNotificationItem[] = Array.from({ length: 70 }, (_, i) => ({
      id: `ev-${i}`,
      treatmentId: 'treatment-1',
      label: `Dose ${i}`,
      startISO: new Date(now + (i + 1) * 3600 * 1000).toISOString(),
      done: false,
    }));

    const count = await scheduleSlidingWindowNotifications(mockEvents);

    expect(count).toBe(50);
    expect(count).toBeLessThanOrEqual(64); // Limite rígido do iOS (64)
  });

  it('discards past or completed doses from the notification schedule', async () => {
    const now = Date.now();
    const mockEvents: DoseNotificationItem[] = [
      {
        id: 'past-event',
        treatmentId: 't-1',
        label: 'Dose do passado',
        startISO: new Date(now - 3600 * 1000).toISOString(), // 1h atrás
        done: false,
      },
      {
        id: 'completed-event',
        treatmentId: 't-1',
        label: 'Dose já tomada',
        startISO: new Date(now + 3600 * 1000).toISOString(),
        done: true,
      },
      {
        id: 'future-valid-event',
        treatmentId: 't-1',
        label: 'Dose pendente futura',
        startISO: new Date(now + 2 * 3600 * 1000).toISOString(),
        done: false,
      },
    ];

    const count = await scheduleSlidingWindowNotifications(mockEvents);

    expect(count).toBe(1);
  });

  it('syncs medication events directly to device native calendar', async () => {
    const mockDoses: CalendarDoseItem[] = [
      {
        title: 'Tomar Amoxicilina 500mg',
        startISO: '2026-10-15T08:00:00.000Z',
        notes: 'Tomar com água após o café',
      },
      {
        title: 'Tomar Amoxicilina 500mg',
        startISO: '2026-10-15T16:00:00.000Z',
      },
    ];

    const addedCount = await syncEventsToNativeCalendar('Tratamento Infecção', mockDoses);

    expect(addedCount).toBe(2);
  });
});
