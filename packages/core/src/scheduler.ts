import { TreatmentPlan, TreatmentItem, CalendarEvent } from './types';

export function expandPlanToEvents(
  plan: TreatmentPlan, 
  startDateTime: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  plan.items.forEach(item => {
    const itemEvents = generateEventsForItem(item, startDateTime);
    events.push(...itemEvents);
  });

  // Ordenar eventos por data
  return events.sort((a, b) => 
    new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
  );
}

function generateEventsForItem(
  item: TreatmentItem, 
  startDateTime: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const startDate = new Date(startDateTime);

  if (item.frequency.everyHours) {
    // Frequência por horas (ex: q8h)
    const intervalMs = item.frequency.everyHours * 60 * 60 * 1000;
    const endDate = new Date(startDate.getTime() + (item.durationDays * 24 * 60 * 60 * 1000));
    
    let currentDateTime = new Date(startDate);
    while (currentDateTime < endDate) {
      events.push(createEventFromItem(item, currentDateTime));
      currentDateTime = new Date(currentDateTime.getTime() + intervalMs);
    }
  } else if (item.frequency.timesPerDay) {
    // Frequência por dia (ex: 3x/dia)
    const timesPerDay = item.frequency.timesPerDay;
    const resolvedTimes: string[] = [];

    if (item.preferredTimes && item.preferredTimes.length > 0) {
      // Usar horários preferenciais informados
      resolvedTimes.push(...item.preferredTimes.slice(0, timesPerDay));
      // Se faltarem horários para cumprir timesPerDay, interpolar as doses faltantes
      if (resolvedTimes.length < timesPerDay) {
        const missingCount = timesPerDay - resolvedTimes.length;
        const intervalHours = 24 / timesPerDay;
        const lastTime = resolvedTimes[resolvedTimes.length - 1];
        const [lastH, lastM] = lastTime.split(':').map(Number);
        for (let i = 1; i <= missingCount; i++) {
          const nextHour = (lastH + Math.round(i * intervalHours)) % 24;
          const hourStr = String(nextHour).padStart(2, '0');
          const minuteStr = String(isNaN(lastM) ? 0 : lastM).padStart(2, '0');
          resolvedTimes.push(`${hourStr}:${minuteStr}`);
        }
      }
    } else {
      // Distribuir uniformemente durante o dia
      const hoursInterval = 24 / timesPerDay;
      const startHour = startDate.getHours();
      for (let i = 0; i < timesPerDay; i++) {
        const eventHour = (startHour + Math.round(i * hoursInterval)) % 24;
        const hourStr = String(eventHour).padStart(2, '0');
        const minuteStr = String(startDate.getMinutes()).padStart(2, '0');
        resolvedTimes.push(`${hourStr}:${minuteStr}`);
      }
    }

    for (let day = 0; day < item.durationDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      resolvedTimes.forEach(timeStr => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const eventDateTime = new Date(currentDate);
        eventDateTime.setHours(hours, minutes, 0, 0);
        events.push(createEventFromItem(item, eventDateTime));
      });
    }
  }

  return events;
}

function createEventFromItem(item: TreatmentItem, dateTime: Date): CalendarEvent {
  const title = item.type === 'medication'
    ? `Tomar ${item.name}${item.dose ? ` ${item.dose}${item.unit || 'mg'}` : ''}`
    : `Fazer ${item.name}`;

  const description = [
    item.route ? `Via: ${item.route}` : '',
    item.notes ? `Obs: ${item.notes}` : ''
  ].filter(Boolean).join('\n');

  const endDateTime = new Date(dateTime.getTime() + 5 * 60 * 1000); // +5 minutos

  return {
    title,
    description: description || undefined,
    startISO: dateTime.toISOString(),
    endISO: endDateTime.toISOString()
  };
}

export function formatEventForDisplay(event: CalendarEvent): string {
  const date = new Date(event.startISO);
  const dateStr = date.toLocaleDateString('pt-BR');
  const timeStr = date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `${dateStr} às ${timeStr} - ${event.title}`;
}
