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
    
    // Janela exclusiva no fim: um tratamento de D dias termina quando o dia D começa.
    // Com `<=`, q8h/7d gerava 22 doses — uma além do tratamento. Ver FR-SCH-01.
    let currentDateTime = new Date(startDate);
    while (currentDateTime < endDate) {
      events.push(createEventFromItem(item, currentDateTime));
      currentDateTime = new Date(currentDateTime.getTime() + intervalMs);
    }
  } else if (item.frequency.timesPerDay) {
    // Frequência por dia (ex: 3x/dia)
    const timesPerDay = item.frequency.timesPerDay;
    
    for (let day = 0; day < item.durationDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      if (item.preferredTimes && item.preferredTimes.length > 0) {
        // Usar horários preferenciais
        item.preferredTimes.slice(0, timesPerDay).forEach(timeStr => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const eventDateTime = new Date(currentDate);
          eventDateTime.setHours(hours, minutes, 0, 0);
          events.push(createEventFromItem(item, eventDateTime));
        });
      } else {
        // Distribuir uniformemente a partir do horário de início, avançando no tempo.
        //
        // A versão anterior calculava a hora do relógio com `% 24` sem avançar o dia,
        // então 3x/dia começando às 20:00 gerava doses às 04:00 e 12:00 do MESMO dia —
        // duas doses antes do início do tratamento. O offset absoluto abaixo nunca
        // retrocede, preserva os minutos do início e mantém intervalos fracionários
        // exatos (5x/dia = 4h48m, não 4h). Ver FR-SCH-03.
        const intervalMs = (24 / timesPerDay) * 60 * 60 * 1000;
        const dayOffsetMs = day * 24 * 60 * 60 * 1000;

        for (let i = 0; i < timesPerDay; i++) {
          const eventDateTime = new Date(startDate.getTime() + dayOffsetMs + (i * intervalMs));
          events.push(createEventFromItem(item, eventDateTime));
        }
      }
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