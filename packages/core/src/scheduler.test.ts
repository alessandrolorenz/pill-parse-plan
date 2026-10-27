import { describe, it, expect } from 'vitest';
import {
  expandPlanToEvents,
  formatEventForDisplay,
  getPlanSchedulingIssues,
  toEventRow,
  CONTINUOUS_HORIZON_DAYS
} from './scheduler';
import { TreatmentPlan, TreatmentItem } from './types';

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

  const item = (overrides: Partial<TreatmentItem>): TreatmentItem => ({
    name: 'Losartana',
    type: 'medication',
    durationDays: 7,
    frequency: { timesPerDay: 1 },
    ...overrides
  });
  const planWith = (...items: TreatmentItem[]): TreatmentPlan => ({ planTitle: 'Teste', summary: 'Teste', items });

  describe('getPlanSchedulingIssues', () => {
    it('returns no issues for a valid plan', () => {
      expect(getPlanSchedulingIssues(planWith(item({})))).toEqual([]);
    });

    it.each([null, 0, undefined, 2.5])('flags durationDays = %s', (durationDays) => {
      const issues = getPlanSchedulingIssues(planWith(item({ durationDays: durationDays as number | null })));
      expect(issues).toEqual([{ itemIndex: 0, field: 'durationDays', message: expect.any(String) }]);
    });

    it('accepts missing duration when the item is continuous', () => {
      expect(getPlanSchedulingIssues(planWith(item({ durationDays: null, continuous: true })))).toEqual([]);
    });

    it('flags missing frequency and points at the right item', () => {
      const issues = getPlanSchedulingIssues(planWith(item({}), item({ frequency: {} })));
      expect(issues).toEqual([{ itemIndex: 1, field: 'frequency', message: expect.any(String) }]);
    });
  });

  it('generates CONTINUOUS_HORIZON_DAYS days for continuous items', () => {
    const events = expandPlanToEvents(planWith(item({ durationDays: null, continuous: true })), baseDate);
    expect(events.length).toBe(CONTINUOUS_HORIZON_DAYS);
  });

  it('generates no events (instead of crashing) when duration is missing', () => {
    expect(expandPlanToEvents(planWith(item({ durationDays: null })), baseDate)).toEqual([]);
  });

  describe('toEventRow', () => {
    it('keeps the local wall-clock date and time', () => {
      const morning = new Date(2026, 9, 14, 8, 0, 0);
      const night = new Date(2026, 9, 14, 22, 30, 0);
      expect(toEventRow({ title: 'x', startISO: morning.toISOString() })).toEqual({ date: '2026-10-14', time: '08:00:00' });
      expect(toEventRow({ title: 'x', startISO: night.toISOString() })).toEqual({ date: '2026-10-14', time: '22:30:00' });
    });
  });
});
