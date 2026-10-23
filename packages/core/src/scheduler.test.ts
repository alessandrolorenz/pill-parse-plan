import { describe, it, expect } from 'vitest';
import { expandPlanToEvents, formatEventForDisplay } from './scheduler';
import { TreatmentPlan } from './types';

describe('packages/core scheduler', () => {
  const baseDate = new Date('2026-10-14T08:00:00.000Z');

  it('generates exact 21 doses for 7 days q8h without boundary overflow', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Core Scheduler Test',
      summary: 'Amoxicilina 500mg q8h',
      items: [
        {
          name: 'Amoxicilina',
          dose: 500,
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
    expect(events.length).toBe(21);
    expect(events[0].title).toBe('Tomar Amoxicilina 500mg');
  });

  it('interpolates doses when preferredTimes has fewer items than timesPerDay', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Core Preferred Times Interpolation',
      summary: 'Dipirona 3x/dia com 1 horário',
      items: [
        {
          name: 'Dipirona',
          dose: 500,
          unit: 'mg',
          type: 'medication',
          durationDays: 1,
          frequency: {
            timesPerDay: 3
          },
          preferredTimes: ['08:00']
        }
      ]
    };

    const events = expandPlanToEvents(plan, baseDate);
    expect(events.length).toBe(3);
    expect(formatEventForDisplay(events[0])).toContain('Tomar Dipirona 500mg');
  });
});
