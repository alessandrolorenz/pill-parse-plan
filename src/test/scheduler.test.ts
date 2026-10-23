import { describe, it, expect } from 'vitest';
import { expandPlanToEvents, formatEventForDisplay } from '@/lib/scheduler';
import { TreatmentPlan } from '@/lib/types';

describe('scheduler (Golden Master & Domain Rules)', () => {
  const baseDate = new Date('2026-10-14T08:00:00.000Z');

  it('expands q8h frequency for 7 days with exact expected dose count (21 doses)', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Antibiótico q8h',
      summary: 'Amoxicilina 500mg a cada 8 horas por 7 dias',
      items: [
        {
          name: 'Amoxicilina',
          dose: '500',
          unit: 'mg',
          type: 'medication',
          durationDays: 7,
          frequency: {
            everyHours: 8
          }
        }
      ]
    };

    const events = expandPlanToEvents(plan, baseDate);
    // 7 dias * (24 / 8) doses = 21 doses
    expect(events.length).toBe(21);
    expect(events[0].title).toBe('Tomar Amoxicilina 500mg');
    expect(events[0].startISO).toBe('2026-10-14T08:00:00.000Z');
    // Última dose deve ser 160h após o início (2026-10-21T00:00:00.000Z)
    expect(events[events.length - 1].startISO).toBe('2026-10-21T00:00:00.000Z');
  });

  it('handles timesPerDay with full preferredTimes correctly', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Anti-hipertensivo',
      summary: 'Losartana 50mg 2x ao dia',
      items: [
        {
          name: 'Losartana',
          dose: '50',
          unit: 'mg',
          type: 'medication',
          durationDays: 3,
          frequency: {
            timesPerDay: 2
          },
          preferredTimes: ['08:00', '20:00']
        }
      ]
    };

    const events = expandPlanToEvents(plan, new Date('2026-10-14T08:00:00'));
    // 3 dias * 2 doses = 6 doses
    expect(events.length).toBe(6);
  });

  it('interpolates missing doses when preferredTimes has fewer items than timesPerDay', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Tratamento 3x ao dia com apenas 1 horário preferencial',
      summary: 'Medicamento 3x/dia mas com apenas 08:00 informado',
      items: [
        {
          name: 'Medicamento Teste',
          dose: '10',
          unit: 'mg',
          type: 'medication',
          durationDays: 2,
          frequency: {
            timesPerDay: 3
          },
          preferredTimes: ['08:00']
        }
      ]
    };

    const events = expandPlanToEvents(plan, new Date('2026-10-14T08:00:00'));
    // 2 dias * 3 doses = 6 doses no total (não pode truncar para 2 doses)
    expect(events.length).toBe(6);
  });

  it('distributes doses evenly when no preferredTimes are provided', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Sem horários preferenciais',
      summary: 'Medicamento 4x ao dia sem horário especificado',
      items: [
        {
          name: 'Dipirona',
          dose: '500',
          unit: 'mg',
          type: 'medication',
          durationDays: 1,
          frequency: {
            timesPerDay: 4
          }
        }
      ]
    };

    const events = expandPlanToEvents(plan, new Date('2026-10-14T08:00:00'));
    expect(events.length).toBe(4);
  });

  it('formats care type items without dose label', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Fisioterapia',
      summary: 'Compressa morna',
      items: [
        {
          name: 'Compressa Morna',
          type: 'care',
          durationDays: 1,
          frequency: {
            timesPerDay: 1
          },
          preferredTimes: ['10:00']
        }
      ]
    };

    const events = expandPlanToEvents(plan, new Date('2026-10-14T08:00:00'));
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('Fazer Compressa Morna');
    expect(formatEventForDisplay(events[0])).toContain('Fazer Compressa Morna');
  });
});
