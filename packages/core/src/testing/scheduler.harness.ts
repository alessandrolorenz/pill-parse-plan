/**
 * Scheduler parity harness.
 *
 * Encodes _specs/core/scheduler.spec.md as executable assertions. It receives
 * the implementation under test plus the runner's globals, so the identical
 * assertions run under three drivers: Vitest (web), Jest (React Native
 * toolchain), and the on-device collector in apps/mobile. Do not import a
 * runner here.
 *
 * Every assertion is labelled with the acceptance criterion it enforces.
 *
 * WHY THIS LIVES IN testing/ AND NOT __tests__/: this file is not a test, it is
 * a shared contract artifact that tests consume — and Metro's default blockList
 * (/\\__tests__\\.*$/) makes anything under __tests__ invisible to the React
 * Native bundler. Moving it back would break the on-device runner with a
 * confusing "file does not exist" error for a file that plainly exists.
 */

import type { TreatmentPlan, TreatmentItem, CalendarEvent } from '../types';
import type { expandPlanToEvents as ExpandPlanToEvents } from '../scheduler';

/**
 * Minimal structural stand-ins for the runner globals — keeps this file runner-agnostic.
 *
 * `Matchers` is deliberately the smallest surface this harness uses. Both Vitest and
 * Jest satisfy it, so widening it later is the moment to check that React Native's
 * runner still does.
 */
type DescribeFn = (name: string, fn: () => void) => void;
type ItFn = (name: string, fn: () => void) => void;
interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
}
type ExpectFn = (actual: unknown) => Matchers;

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Fixed start: 2026-09-01 20:00 local. Deliberately an evening start — see AC-04. */
const START_2000 = new Date(2026, 8, 1, 20, 0, 0, 0);

function plan(...items: TreatmentItem[]): TreatmentPlan {
  return { planTitle: 'Plano de teste', summary: 'fixture', items };
}

function med(overrides: Partial<TreatmentItem> = {}): TreatmentItem {
  return {
    type: 'medication',
    name: 'Amoxicilina',
    dose: 500,
    unit: 'mg',
    frequency: { everyHours: 8 },
    durationDays: 7,
    ...overrides,
  };
}

/** Offset of an event from a start instant, in hours. */
function offsetHours(event: CalendarEvent, from: Date): number {
  return (new Date(event.startISO).getTime() - from.getTime()) / HOUR;
}

/** Local wall-clock "HH:MM" of an event, which is how a user reads it. */
function localHHMM(event: CalendarEvent): string {
  const d = new Date(event.startISO);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function runSchedulerHarness(
  expandPlanToEvents: typeof ExpandPlanToEvents,
  describe: DescribeFn,
  it: ItFn,
  expect: ExpectFn
) {
  describe('Scheduler harness — _specs/core/scheduler.spec.md', () => {
    describe('FR-SCH-01: everyHours frequency', () => {
      it('AC-01: q8h for 7 days produces exactly 21 events', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 8 }, durationDays: 7 })),
          START_2000
        );
        expect(events.length).toBe(21);
      });

      it('AC-01: the first event is at the start instant and the last at +160h', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 8 }, durationDays: 7 })),
          START_2000
        );
        expect(offsetHours(events[0], START_2000)).toBe(0);
        expect(offsetHours(events[events.length - 1], START_2000)).toBe(160);
      });

      it('AC-02: q24h for 7 days produces exactly 7 events, one per day', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 24 }, durationDays: 7 })),
          START_2000
        );
        expect(events.length).toBe(7);
        expect(events.map((e) => offsetHours(e, START_2000))).toEqual([
          0, 24, 48, 72, 96, 120, 144,
        ]);
      });

      it('EC-06: an interval that does not divide the window evenly stops inside it', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 5 }, durationDays: 1 })),
          START_2000
        );
        expect(events.length).toBe(5);
        expect(offsetHours(events[events.length - 1], START_2000)).toBe(20);
      });
    });

    describe('FR-SCH-03: timesPerDay without preferredTimes', () => {
      it('AC-03: 3x/day for 5 days produces exactly 15 events', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 5 })),
          START_2000
        );
        expect(events.length).toBe(15);
      });

      it('AC-04: an evening start never schedules a dose before the start instant', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 2 })),
          START_2000
        );
        const earliest = Math.min(...events.map((e) => offsetHours(e, START_2000)));
        expect(earliest).toBe(0);
      });

      it('AC-04: 3x/day from 20:00 runs 20:00, 04:00, 12:00 forward across days', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 2 })),
          START_2000
        );
        expect(events.map((e) => offsetHours(e, START_2000))).toEqual([
          0, 8, 16, 24, 32, 40,
        ]);
        expect(events.map(localHHMM)).toEqual([
          '20:00', '04:00', '12:00', '20:00', '04:00', '12:00',
        ]);
      });

      it('AC-05: the start minute is preserved on every event', () => {
        const start = new Date(2026, 8, 1, 20, 30, 0, 0);
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 2 })),
          start
        );
        for (const event of events) {
          expect(new Date(event.startISO).getMinutes()).toBe(30);
        }
      });

      it('AC-06: 5x/day spaces doses exactly 4h48m apart, without truncation', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 5 }, durationDays: 1 })),
          START_2000
        );
        expect(events.length).toBe(5);
        expect(events.map((e) => offsetHours(e, START_2000))).toEqual([
          0, 4.8, 9.6, 14.4, 19.2,
        ]);
      });
    });

    describe('FR-SCH-04: the two frequency branches agree', () => {
      it('AC-07: timesPerDay:3 is identical to everyHours:8', () => {
        const byTimesPerDay = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 5 })),
          START_2000
        );
        const byEveryHours = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 8 }, durationDays: 5 })),
          START_2000
        );
        expect(byTimesPerDay).toEqual(byEveryHours);
      });

      it('AC-07: timesPerDay:2 is identical to everyHours:12', () => {
        const byTimesPerDay = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 2 }, durationDays: 3 })),
          START_2000
        );
        const byEveryHours = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 12 }, durationDays: 3 })),
          START_2000
        );
        expect(byTimesPerDay).toEqual(byEveryHours);
      });
    });

    describe('FR-SCH-02: timesPerDay with preferredTimes', () => {
      it('AC-08: 3x/day for 5 days at fixed times produces 15 events at those times', () => {
        const events = expandPlanToEvents(
          plan(
            med({
              frequency: { timesPerDay: 3 },
              durationDays: 5,
              preferredTimes: ['08:00', '14:00', '20:00'],
            })
          ),
          START_2000
        );
        expect(events.length).toBe(15);
        expect(new Set(events.map(localHHMM))).toEqual(
          new Set(['08:00', '14:00', '20:00'])
        );
      });

      it('EC-03: fewer preferredTimes than timesPerDay yields fewer events per day', () => {
        const events = expandPlanToEvents(
          plan(
            med({
              frequency: { timesPerDay: 3 },
              durationDays: 4,
              preferredTimes: ['08:00', '20:00'],
            })
          ),
          START_2000
        );
        expect(events.length).toBe(8);
      });
    });

    describe('FR-SCH-05 / FR-SCH-06: title and description', () => {
      it('AC-10: a medication with a dose renders "Tomar {name} {dose}{unit}"', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 24 }, durationDays: 1 })),
          START_2000
        );
        expect(events[0].title).toBe('Tomar Amoxicilina 500mg');
      });

      it('AC-10: a medication without a dose renders "Tomar {name}"', () => {
        const events = expandPlanToEvents(
          plan(
            med({
              dose: undefined,
              unit: undefined,
              frequency: { everyHours: 24 },
              durationDays: 1,
            })
          ),
          START_2000
        );
        expect(events[0].title).toBe('Tomar Amoxicilina');
      });

      it('AC-10: a care item renders "Fazer {name}"', () => {
        const events = expandPlanToEvents(
          plan(
            med({
              type: 'care',
              name: 'Repouso',
              dose: undefined,
              unit: undefined,
              frequency: { everyHours: 24 },
              durationDays: 1,
            })
          ),
          START_2000
        );
        expect(events[0].title).toBe('Fazer Repouso');
      });

      it('AC-13: route and notes are joined into the description', () => {
        const events = expandPlanToEvents(
          plan(
            med({
              route: 'VO',
              notes: 'Após refeições',
              frequency: { everyHours: 24 },
              durationDays: 1,
            })
          ),
          START_2000
        );
        expect(events[0].description).toBe('Via: VO\nObs: Após refeições');
      });

      it('AC-13: neither route nor notes leaves the description undefined', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 24 }, durationDays: 1 })),
          START_2000
        );
        expect(events[0].description).toBe(undefined);
      });
    });

    describe('FR-SCH-07 / FR-SCH-08: duration and ordering', () => {
      it('AC-11: every event ends exactly 5 minutes after it starts', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 8 }, durationDays: 3 })),
          START_2000
        );
        for (const event of events) {
          const span =
            new Date(event.endISO!).getTime() - new Date(event.startISO).getTime();
          expect(span).toBe(5 * MINUTE);
        }
      });

      it('AC-12: a multi-item plan is sorted ascending and interleaved', () => {
        const events = expandPlanToEvents(
          plan(
            med({ name: 'Amoxicilina', frequency: { everyHours: 8 }, durationDays: 2 }),
            med({ name: 'Ibuprofeno', frequency: { everyHours: 12 }, durationDays: 2 })
          ),
          START_2000
        );

        const times = events.map((e) => new Date(e.startISO).getTime());
        expect([...times].sort((a, b) => a - b)).toEqual(times);

        // Both medications must be present — proves interleaving, not concatenation.
        const names = new Set(events.map((e) => e.title));
        expect(names.size).toBe(2);
      });
    });

    describe('Edge cases', () => {
      it('AC-09: durationDays 0 produces no events on the everyHours branch', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { everyHours: 8 }, durationDays: 0 })),
          START_2000
        );
        expect(events).toEqual([]);
      });

      it('AC-09: durationDays 0 produces no events on the timesPerDay branch', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: { timesPerDay: 3 }, durationDays: 0 })),
          START_2000
        );
        expect(events).toEqual([]);
      });

      it('EC-02: an item with neither frequency set produces no events', () => {
        const events = expandPlanToEvents(
          plan(med({ frequency: {}, durationDays: 5 })),
          START_2000
        );
        expect(events).toEqual([]);
      });

      it('EC-02: an unschedulable item does not suppress the rest of the plan', () => {
        const events = expandPlanToEvents(
          plan(
            med({ name: 'Sem frequência', frequency: {}, durationDays: 5 }),
            med({ name: 'Amoxicilina', frequency: { everyHours: 24 }, durationDays: 3 })
          ),
          START_2000
        );
        expect(events.length).toBe(3);
      });

      it('EC-05: an empty plan produces an empty array', () => {
        const events = expandPlanToEvents(plan(), START_2000);
        expect(events).toEqual([]);
      });
    });
  });
}
