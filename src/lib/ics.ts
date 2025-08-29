import { CalendarEvent } from './types';

function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

export function eventsToICS(events: CalendarEvent[], filename: string = 'tratamento-medicamentos.ics'): void {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tratamento Médico//pt-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach((event, index) => {
    const startDate = new Date(event.startISO);
    const endDate = new Date(event.endISO || event.startISO);
    const uid = `treatment-${Date.now()}-${index}@medicamentos.local`;
    
    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${escapeICSText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
      `DTSTAMP:${formatDateForICS(new Date())}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');

  // Gerar conteúdo ICS
  const icsContent = icsLines.filter(line => line !== '').join('\r\n');
  
  // Criar e baixar arquivo
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

export function createGoogleCalendarUrl(events: CalendarEvent[]): string {
  if (events.length === 0) return '';
  
  // Para múltiplos eventos, vamos criar uma URL para o primeiro evento
  // e instruir o usuário a importar o arquivo ICS para todos os eventos
  const firstEvent = events[0];
  const startDate = new Date(firstEvent.startISO);
  const endDate = new Date(firstEvent.endISO || firstEvent.startISO);
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: firstEvent.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: firstEvent.description || '',
    trp: 'false'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}