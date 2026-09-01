# Behavioral Parity Matrix

Migration progress for the React Native port. Each row is a behavioral contract; each column is a
platform.

**A ✅ means a harness ran and passed on that platform.** Nothing else earns one — not "the code
looks right", not "the web app does this today". A contract with no harness is ⬜ even if the
behavior demonstrably works in the browser.

> This table supersedes §6.1 of `_plans/rn-migration-sdd-guide.md`, which pre-marked the Web
> column ✅ for seventeen contracts before any harness existed. Three of those "passing" contracts
> turned out to be wrong when actually executed — including a dosing bug. Aspirational ✅s are
> worse than blank ones: they hide exactly the divergence the matrix exists to surface.

Last updated: 2026-09-01 · **25/25 under Vitest (web), 25/25 under Jest, 25/25 on Hermes** — the
Hermes run executed on an Android 17 emulator (Pixel_9), Expo Go 57, `Hermes for RN 0.86.2`.

### Why RN is two columns

`RN · Jest` and `RN · Hermes` are **different claims** and are tracked separately. `jest-expo`
runs in Node/V8, so a green Jest run proves the harness contract holds under a second runner and
that `packages/core` resolves and transforms under Babel/Metro. It says nothing about Hermes, the
engine React Native actually ships. Collapsing the two into one ✅ would repeat exactly the
overstatement this file was written to correct.

Legend: ✅ ran and passed · ◐ partially evidenced, see note · ⬜ not verified

## Phase 1 — Core domain (`@pill-parse/core`)

| Behavioral contract | Spec | Web | RN · Jest | RN · Hermes |
|---|---|:--:|:--:|:--:|
| `everyHours`: event count over the window | FR-SCH-01 / AC-01 | ✅ | ✅ | ✅ |
| `everyHours`: window is end-exclusive | FR-SCH-01 / AC-01, AC-02 | ✅ | ✅ | ✅ |
| `everyHours`: interval not dividing the window evenly | EC-06 | ✅ | ✅ | ✅ |
| `timesPerDay`: event count | FR-SCH-03 / AC-03 | ✅ | ✅ | ✅ |
| `timesPerDay`: never doses before the start instant | FR-SCH-03 / AC-04 | ✅ | ✅ | ✅ |
| `timesPerDay`: start minute preserved | FR-SCH-03 / AC-05 | ✅ | ✅ | ✅ |
| `timesPerDay`: fractional intervals exact | FR-SCH-03 / AC-06 | ✅ | ✅ | ✅ |
| Invariant: `timesPerDay: T` ≡ `everyHours: 24/T` | FR-SCH-04 / AC-07 | ✅ | ✅ | ✅ |
| `preferredTimes`: fixed wall-clock times per day | FR-SCH-02 / AC-08 | ✅ | ✅ | ✅ |
| `preferredTimes`: fewer entries than `timesPerDay` | EC-03 | ✅ | ✅ | ✅ |
| Event title format (medication / care) | FR-SCH-05 / AC-10 | ✅ | ✅ | ✅ |
| Event description composition | FR-SCH-06 / AC-13 | ✅ | ✅ | ✅ |
| Event duration is 5 minutes | FR-SCH-07 / AC-11 | ✅ | ✅ | ✅ |
| Multi-item output sorted and interleaved | FR-SCH-08 / AC-12 | ✅ | ✅ | ✅ |
| `durationDays: 0` on both branches | EC-01 / AC-09 | ✅ | ✅ | ✅ |
| Unschedulable item does not suppress the plan | EC-02 | ✅ | ✅ | ✅ |
| Empty plan | EC-05 | ✅ | ✅ | ✅ |
| Domain types carry no platform imports | AC-T04 | ✅ | ✅ | ✅ |

AC-T04 is marked across all three columns because it is enforced statically rather than at
runtime: `packages/core/src/__tests__/purity.test.ts` scans every shipped file for external
imports, platform globals, and `Intl`/`toLocale*`, and `eslint.config.js` denies the same imports
per layer. A violation therefore cannot reach any platform. See `_specs/architecture.md`.

**The Hermes column was executed, not inferred.** The harness screen was run in Expo Go 57 on a
Pixel_9 emulator (Android 17), and the app logged:

```
[parity] PASS 25/25 on Hermes for RN 0.86.2
```

The engine string is read from `HermesInternal.getRuntimeProperties()` at runtime, so a green run
cannot be mistaken for a V8 run.

### Negative control

A parity harness that cannot fail is worse than no harness. AC-01's expected value was temporarily
changed from 21 to 20, and **all three drivers went red on that assertion by name**:

| Driver | Result with AC-01 broken |
|---|---|
| Vitest | 1 failed, 24 passed |
| Jest | 1 failed, 24 passed |
| Hermes (on device, via fast refresh) | `[parity] FAIL 24/25 on Hermes for RN 0.86.2` → `FAILED AC-01 … expected 20, received 21` |

Reverted afterwards; all three returned to 25/25. The Vitest and Jest drivers were additionally
diffed and assert an **identical set of 25 names**, not merely an identical count.

This matters most for the third driver, whose `toEqual` is hand-rolled: a permissive deep-equal
would have produced a green run that meant nothing. It fails when it should.

## Phase 2+ — Not yet started

No harnesses exist for these. Listed so the gaps are visible rather than implied.

| Area | Spec | Web | RN |
|---|---|:--:|:--:|
| Supabase client / storage adapter | *not written* | ⬜ | ⬜ |
| OpenAI prescription analysis (MSW contract) | *not written* | ⬜ | ⬜ |
| Auth: sign in / sign up / OAuth / sign out | *not written* | ⬜ | ⬜ |
| Auth: session persistence | *not written* | ⬜ | ⬜ |
| Treatment persistence round trip | *not written* | ⬜ | ⬜ |
| Plan restrictions (free vs premium) | *not written* | ⬜ | ⬜ |
| Navigation flow (`AppStep` state machine) | *not written* | ⬜ | ⬜ |
| Image capture and base64 encoding | *not written* | ⬜ | ⬜ |
| Notifications | *not written* | ⬜ | ⬜ |

## Known divergences to spec before porting

Real defects found while building the Phase 1 baseline, deliberately not fixed in this increment.
Each needs a spec and a harness before the corresponding phase ports it, or the RN app inherits it:

- **Timezone round trip** — `expandPlanToEvents` emits UTC; `useSupabaseTreatments.addTreatment`
  splits into `date`/`time` dropping the `Z`; `SupabaseScheduleView` re-reads
  `` `${date}T${time}` `` with no offset, so it parses as *local*. Off-by-hours in
  `America/Sao_Paulo`. Blocks the persistence-layer contract above.
- **Lossy persistence** — an `events` row is `{date, time, label, done}`; `description` and
  `endISO` are dropped and reconstructed. `CalendarEvent` is not round-trip stable, so the
  persistence harness must assert the reconstructed shape.
- **Stale generated types** — `src/integrations/supabase/types.ts` omits `push_subscriptions` and
  `notification_reminders`. Regenerate before Phase 2.
- **Model drift** — the Edge Function uses `gpt-4.1-2025-04-14`; the dead Express copy uses
  `gpt-4o`. Pin one before writing the OpenAI contract harness.
- **Open clinical questions** — OQ-01 (`preferredTimes` earlier than the start time still dose on
  day 0) and OQ-02 (a missing `unit` renders as `mg`) in `_specs/core/scheduler.spec.md`. Both are
  currently specced as-is; both deserve a clinical decision before mobile ships.
