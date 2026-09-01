# Spec for treatment-scheduler

branch: aicockpit/core/scheduler
platform: universal (web + React Native)
package: `@pill-parse/core`
implementation: [packages/core/src/scheduler.ts](../../packages/core/src/scheduler.ts)

## Summary

Given a `TreatmentPlan` and a start `Date`, produce a sorted list of `CalendarEvent`s
representing every dose or care action for the full duration of the treatment.

`expandPlanToEvents` is a pure function with no platform dependencies. It is the highest-value
migration contract in the codebase: web and React Native must produce **identical** output for
identical input, so this spec is the authority for both.

> **This spec pins corrected behavior, not current behavior.** Three requirements below
> (FR-SCH-01, FR-SCH-03, EC-01) describe output that differs from the implementation as of
> 2026-09-01. See "Behavior changes" for what changed and why.

## Functional Requirements

### FR-SCH-01: `everyHours` frequency

Given `item.frequency.everyHours = H` and `item.durationDays = D`, emit an event at every offset
`n · H` hours from `startDateTime`, for `n = 0, 1, 2, …`, while that offset is **strictly less
than** `D · 24` hours.

- The treatment window is **end-exclusive**: a `D`-day course ends when day `D` begins.
- Event count is exactly `ceil(D · 24 / H)`.
- q8h for 7 days = **21** events (not 22). The first is at `startDateTime`; the last is at
  `startDateTime + 160h`.

### FR-SCH-02: `timesPerDay` with `preferredTimes`

Given `item.frequency.timesPerDay = T` and a non-empty `item.preferredTimes`, then for each
calendar day `d = 0 … D-1`, emit one event for each of the **first `T`** entries of
`preferredTimes`, at that clock time on the calendar day `startDateTime + d days`.

- Times are applied as wall-clock times on each day; the start time's own clock component is
  ignored.
- If `preferredTimes` has fewer than `T` entries, only that many events are emitted per day
  (see EC-03).

### FR-SCH-03: `timesPerDay` without `preferredTimes`

Given `item.frequency.timesPerDay = T` and no `preferredTimes`, emit events at offsets
`(d · 24) + (i · 24/T)` hours from `startDateTime`, for `d = 0 … D-1` and `i = 0 … T-1`.

- Event count is exactly `T · D`.
- **No event may fall before `startDateTime`.** Doses are spaced forward from the start; when a
  dose lands past midnight it belongs to the following calendar day.
- The minute component of `startDateTime` is preserved on every event.
- Fractional intervals are exact: `T = 5` yields a 4.8-hour spacing, not 4.

### FR-SCH-04: Invariant — the two branches agree

For any `T` and `D`, `{ timesPerDay: T }` with no `preferredTimes` MUST produce the same event
sequence as `{ everyHours: 24/T }`. The two code paths are different implementations of one idea;
this invariant is what keeps them from drifting apart independently.

### FR-SCH-05: Event title format

- `type: 'medication'` with a `dose`: `Tomar {name} {dose}{unit}`
- `type: 'medication'` without a `dose`: `Tomar {name}`
- `type: 'care'`: `Fazer {name}`

When `dose` is present but `unit` is absent, the unit renders as `mg` (see OQ-02).

### FR-SCH-06: Event description

Join the present fields with `\n`, in order; `undefined` when both are absent:

- `Via: {route}` when `route` is set
- `Obs: {notes}` when `notes` is set

### FR-SCH-07: Event duration

`endISO` is exactly 5 minutes after `startISO`, for every event.

### FR-SCH-08: Output ordering

The returned array is sorted ascending by `startISO`, across all items in the plan — a plan with
several medications interleaves them chronologically rather than grouping by medication.

## Possible Edge Cases

- **EC-01** — `durationDays: 0` → **empty array, on both frequency branches.** Falls out of the
  end-exclusive window in FR-SCH-01.
- **EC-02** — neither `everyHours` nor `timesPerDay` set → empty array for that item. Other items
  in the plan are unaffected.
- **EC-03** — `preferredTimes` shorter than `timesPerDay` → only the available times are used, so
  the day is under-dosed relative to `timesPerDay`. Preserved as-is (see OQ-01).
- **EC-04** — `preferredTimes` earlier in the day than `startDateTime`'s clock time → those
  day-0 events fall **before** the start instant. Preserved as-is (see OQ-01).
- **EC-05** — `items: []` → empty array.
- **EC-06** — `everyHours` that does not divide `D · 24` evenly (e.g. `H = 5`, `D = 1`) → the
  final event is the last one strictly inside the window; count is `ceil(D · 24 / H)` = 5.

## Acceptance Criteria

- [ ] AC-01 — q8h, 7 days → exactly **21** events
- [ ] AC-02 — q24h, 7 days → exactly **7** events, one per day
- [ ] AC-03 — 3x/day, 5 days, no `preferredTimes` → exactly **15** events
- [ ] AC-04 — 3x/day starting **20:00**, 2 days → **no event before 20:00 on day 0**; sequence is
      20:00, 04:00 (+1d), 12:00 (+1d), 20:00 (+1d), 04:00 (+2d), 12:00 (+2d)
- [ ] AC-05 — 3x/day starting 20:**30** → every event's minute component is `30`
- [ ] AC-06 — 5x/day, 1 day → 5 events spaced exactly 4h48m apart
- [ ] AC-07 — `{ timesPerDay: 3 }` output is identical to `{ everyHours: 8 }` output (FR-SCH-04)
- [ ] AC-08 — 3x/day, 5 days **with** `preferredTimes` `['08:00','14:00','20:00']` → 15 events,
      all at those three wall-clock times
- [ ] AC-09 — `durationDays: 0` → `[]` for both `everyHours` and `timesPerDay`
- [ ] AC-10 — medication with dose → title `Tomar Amoxicilina 500mg`; without dose →
      `Tomar Amoxicilina`; care → `Fazer Repouso`
- [ ] AC-11 — every event has `endISO − startISO === 5 minutes`
- [ ] AC-12 — output of a two-item plan is sorted ascending and interleaved
- [ ] AC-13 — `route` + `notes` → description `Via: VO\nObs: Após refeições`; neither →
      `undefined`

## Behavior changes

Changes this spec makes to the implementation as of 2026-09-01, and why. Each was verified by
executing the real `expandPlanToEvents` before being written down.

| Ref | Before | After | Why |
|---|---|---|---|
| FR-SCH-01 | Window end-**inclusive** (`<=`): q8h/7d → 22 events | End-**exclusive** (`<`): 21 | 22 doses is one dose beyond a 7-day course. 21 = 7 days × 3/day is the medically correct count, and makes count a clean function of the inputs. |
| FR-SCH-03 | Clock hour wrapped with `% 24` without advancing the day: 3x/day from 20:00 emitted 04:00 and 12:00 **on day 0**, before the treatment started | Absolute forward offsets from the start instant | **Dosing bug.** The patient was shown two doses that had already elapsed. Also fixes `Math.floor` truncation of fractional intervals (5x/day was 4h, not 4h48m). |
| EC-01 | `durationDays: 0` → 1 event on `everyHours`, 0 on `timesPerDay` | 0 on both | The two branches contradicted each other. Zero days means zero doses. |

Existing treatments are unaffected: events are expanded once at creation and persisted as `events`
rows, so only newly created treatments use the corrected schedule. No backfill is required.

## Open Questions

- **OQ-01** — EC-03 and EC-04 are preserved from the current implementation rather than corrected,
  because `preferredTimes` are explicit times chosen by the prescription analysis. Should a
  `preferredTimes` entry earlier than the start time roll to the next day (consistent with
  FR-SCH-03), or is day-0 partial dosing intended? Needs a clinical call.
- **OQ-02** — FR-SCH-05 defaults a missing `unit` to `mg`. Silently asserting a unit is risky in a
  medication app; `Tomar Amoxicilina 500` may be safer than a wrong unit. Needs a clinical call.
- **OQ-03** — `everyHours` and `timesPerDay` are both optional and may both be set. The
  implementation prefers `everyHours`. Should a plan setting both be rejected upstream instead?

## Testing Guidelines

Harness at [packages/core/src/testing/scheduler.harness.ts](../../packages/core/src/testing/scheduler.harness.ts).

Written as an exported function taking `(impl, describe, it, expect)` so the identical assertions
run under three drivers — this is what makes it a *parity* harness rather than a web test. One
assertion per AC above, labelled with its AC id.

| Driver | Runner | Engine | Where |
|---|---|---|---|
| `packages/core/src/__tests__/scheduler.test.ts` | Vitest | Node / V8 | `npm run test:run` |
| `apps/mobile/__tests__/scheduler.test.ts` | Jest (`jest-expo`) | Node / V8 | `npm run test:mobile` |
| `apps/mobile/App.tsx` + `src/harnessRunner.ts` | hand-rolled collector | **Hermes** | Expo Go on a device |

The third driver exists because the first two both run in Node: neither exercises the engine React
Native ships. It is exported from the package as `@pill-parse/core/harness`, and lives in
`testing/` rather than `__tests__/` because Metro's default blockList makes `__tests__` invisible
to the React Native bundler.

All fixtures use a **fixed** start date. `expandPlanToEvents` reads local-time components, so any
test built on `new Date()` would pass or fail depending on the wall clock and the runner's
timezone.
