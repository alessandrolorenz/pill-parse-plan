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

Last updated: 2026-09-01 · `npm run test:run` · **25 passing, 0 failing**

## Phase 1 — Core domain (`@pill-parse/core`)

| Behavioral contract | Spec | Harness | Web | RN |
|---|---|---|:--:|:--:|
| `everyHours`: event count over the window | FR-SCH-01 / AC-01 | `scheduler.harness.ts` | ✅ | ⬜ |
| `everyHours`: window is end-exclusive | FR-SCH-01 / AC-01, AC-02 | `scheduler.harness.ts` | ✅ | ⬜ |
| `everyHours`: interval not dividing the window evenly | EC-06 | `scheduler.harness.ts` | ✅ | ⬜ |
| `timesPerDay`: event count | FR-SCH-03 / AC-03 | `scheduler.harness.ts` | ✅ | ⬜ |
| `timesPerDay`: never doses before the start instant | FR-SCH-03 / AC-04 | `scheduler.harness.ts` | ✅ | ⬜ |
| `timesPerDay`: start minute preserved | FR-SCH-03 / AC-05 | `scheduler.harness.ts` | ✅ | ⬜ |
| `timesPerDay`: fractional intervals exact | FR-SCH-03 / AC-06 | `scheduler.harness.ts` | ✅ | ⬜ |
| Invariant: `timesPerDay: T` ≡ `everyHours: 24/T` | FR-SCH-04 / AC-07 | `scheduler.harness.ts` | ✅ | ⬜ |
| `preferredTimes`: fixed wall-clock times per day | FR-SCH-02 / AC-08 | `scheduler.harness.ts` | ✅ | ⬜ |
| `preferredTimes`: fewer entries than `timesPerDay` | EC-03 | `scheduler.harness.ts` | ✅ | ⬜ |
| Event title format (medication / care) | FR-SCH-05 / AC-10 | `scheduler.harness.ts` | ✅ | ⬜ |
| Event description composition | FR-SCH-06 / AC-13 | `scheduler.harness.ts` | ✅ | ⬜ |
| Event duration is 5 minutes | FR-SCH-07 / AC-11 | `scheduler.harness.ts` | ✅ | ⬜ |
| Multi-item output sorted and interleaved | FR-SCH-08 / AC-12 | `scheduler.harness.ts` | ✅ | ⬜ |
| `durationDays: 0` on both branches | EC-01 / AC-09 | `scheduler.harness.ts` | ✅ | ⬜ |
| Unschedulable item does not suppress the plan | EC-02 | `scheduler.harness.ts` | ✅ | ⬜ |
| Empty plan | EC-05 | `scheduler.harness.ts` | ✅ | ⬜ |
| Domain types carry no platform imports | AC-T04 | *not yet written* | ⬜ | ⬜ |

The RN column stays ⬜ until an `apps/mobile` Jest driver imports `scheduler.harness.ts` and runs
the same assertions. That driver is ~10 lines — the harness itself is already platform-neutral.

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
