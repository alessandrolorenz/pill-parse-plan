import { vi } from 'vitest';

export const EntityTypes = {
  EVENT: 'event',
};

export const SourceType = {
  LOCAL: 'local',
};

export const CalendarAccessLevel = {
  OWNER: 'owner',
};

export const requestCalendarPermissionsAsync = vi.fn().mockResolvedValue({ status: 'granted' });
export const getCalendarsAsync = vi.fn().mockResolvedValue([]);
export const getDefaultCalendarAsync = vi.fn().mockResolvedValue({
  source: { id: 'default-src', name: 'default', type: 'local' },
});
export const createCalendarAsync = vi.fn().mockResolvedValue('calendar-id-123');
export const createEventAsync = vi.fn().mockResolvedValue('event-id-123');
