import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export interface CalendarDoseItem {
  title: string;
  startISO: string;
  notes?: string;
}

export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getDefaultCalendarSource(): Promise<Calendar.Source> {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

export async function getOrCreatePillsCalendarId(): Promise<string | null> {
  const hasPermission = await requestCalendarPermissions();
  if (!hasPermission) return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((cal) => cal.title === 'Pills Planner');

  if (existing) {
    return existing.id;
  }

  // Criar novo calendário dedicado
  let defaultSource: Calendar.Source;
  if (Platform.OS === 'ios') {
    try {
      defaultSource = await getDefaultCalendarSource();
    } catch {
      defaultSource = { isLocalAccount: true, name: 'Pills Planner', type: Calendar.SourceType.LOCAL };
    }
  } else {
    defaultSource = { isLocalAccount: true, name: 'Pills Planner', type: 'LOCAL' };
  }

  const newCalendarId = await Calendar.createCalendarAsync({
    title: 'Pills Planner',
    color: '#106BC6',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource.id,
    source: defaultSource,
    name: 'pills_planner_calendar',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return newCalendarId;
}

/**
 * Insere os eventos de doses diretamente no calendário nativo do dispositivo
 */
export async function syncEventsToNativeCalendar(
  treatmentTitle: string,
  events: CalendarDoseItem[]
): Promise<number> {
  const calendarId = await getOrCreatePillsCalendarId();
  if (!calendarId) return 0;

  let addedCount = 0;
  for (const event of events) {
    const startDate = new Date(event.startISO);
    const endDate = new Date(startDate.getTime() + 10 * 60 * 1000); // 10 min

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      notes: event.notes ? `${treatmentTitle}\nObs: ${event.notes}` : treatmentTitle,
      startDate,
      endDate,
      timeZone: 'UTC',
      alarms: [{ relativeOffset: -5 }], // Alarme 5 minutos antes
    });
    addedCount++;
  }

  return addedCount;
}
