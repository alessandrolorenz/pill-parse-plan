# Spec for core-domain-types

branch: aicockpit/core/types
platform: universal (web + React Native)
package: `@pill-parse/core`
implementation: [packages/core/src/types.ts](../../packages/core/src/types.ts)

## Summary

The four contracts every stage of the pipeline passes between itself. They cross the AI boundary,
the scheduling boundary, and the persistence boundary, so they are the shared vocabulary the web
and React Native apps must agree on exactly.

```
image → TreatmentPlan → CalendarEvent[] → events rows → .ics / push
```

## Functional Requirements

### FR-TYP-01: `TreatmentItem`

One medication or care action extracted from a prescription.

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `'medication'` \| `'care'` — drives the title verb (FR-SCH-05) |
| `name` | yes | e.g. `Amoxicilina` |
| `dose` | no | numeric only; the unit is separate |
| `unit` | no | e.g. `mg` |
| `route` | no | e.g. `VO`, `IM`, `IV` |
| `frequency` | yes | object; see FR-TYP-02 |
| `durationDays` | yes | whole days |
| `preferredTimes` | no | `HH:MM` strings, 24-hour |
| `notes` | no | free text, surfaced as `Obs:` |
| `confidence` | no | `0..1`, the model's certainty for this item |

### FR-TYP-02: `TreatmentItem.frequency`

`{ everyHours?: number; timesPerDay?: number }` — **exactly one should be set.** The type permits
both or neither; the scheduler prefers `everyHours` and emits nothing when neither is set (EC-02
in the scheduler spec). This is a known looseness in the contract, not a designed feature — see
OQ-03 there.

### FR-TYP-03: `TreatmentPlan`

`{ planTitle, summary, items }`. This is the exact shape the `analyze-prescription` Edge Function
returns; `src/lib/openai.ts` validates `planTitle`, `summary`, and `Array.isArray(items)` before
handing it on. Changing this type means changing the `SYSTEM_PROMPT` in
`supabase/functions/analyze-prescription/index.ts` in the same commit.

### FR-TYP-04: `CalendarEvent`

`{ title, description?, startISO, endISO? }`. Times are ISO 8601 strings.

**`startISO` is not a stable representation across the round trip.** `expandPlanToEvents` emits
UTC (`.toISOString()`), but `SupabaseScheduleView` reconstructs it from the persisted `date` and
`time` columns as `` `${date}T${time}` `` — no offset, so it re-parses as *local*. Any harness
over the persistence layer must assert against the **reconstructed** value, not the original.
Tracked as a Phase 4/6 defect; see the "Catalogued" section of the migration plan.

### FR-TYP-05: `TreatmentRecord`

The localStorage shape used by `useTreatments`: a plan plus its expanded events plus completion
state, all in one object.

**This shape is dead in the running app** — `useManagedTreatments` hardcodes `useCloud = true`, so
the Supabase path is the only live one. `TreatmentRecord` is retained because the React Native app
will likely need an offline cache and this is the existing model for one. It is not a live
contract today and should not be treated as one.

### FR-TYP-06: `AppConfig`

Empty type (`{}`), left over from when the OpenAI key was client-side. Referenced by
`ConfigModal.tsx` and `Index.tsx`, both of which are dead or vestigial. Slated for deletion; do
not build on it.

## Possible Edge Cases

- The persisted `events` row is only `{date, time, label, done}`, so a round trip through Supabase
  **loses** `CalendarEvent.description` and `endISO`. `SupabaseScheduleView` substitutes
  `Tratamento: {title}` and `undefined`. `CalendarEvent` is therefore not round-trip stable.
- `confidence` is populated by the model but not currently surfaced in any UI.

## Acceptance Criteria

- [ ] AC-T01 — a `TreatmentPlan` fixture matching the Edge Function's documented output typechecks
      against `TreatmentPlan` with no assertions or casts
- [ ] AC-T02 — `type` accepts only `'medication'` and `'care'`
- [ ] AC-T03 — every optional field can be omitted and the fixture still typechecks
- [ ] AC-T04 — the types are importable from `@pill-parse/core` with no transitive import of any
      browser, Node, or React Native API

## Open Questions

- **OQ-T01** — Should `frequency` become a discriminated union so "exactly one of" is enforced by
  the compiler rather than by convention? This would be a breaking change to the Edge Function's
  output shape.
- **OQ-T02** — Is `TreatmentRecord` the intended offline-cache model for React Native, or should
  the mobile app cache the normalized `treatments` + `events` shape instead? Decide before Phase 4.

## Testing Guidelines

Type-level contracts are enforced by the compiler, so the harness covers what `tsc` cannot:
AC-T04 in particular. A runtime test cannot easily prove the absence of a platform import, so
assert it structurally — `@pill-parse/core` must have no `dependencies` in its `package.json`, and
no file under `packages/core/src/` may reference `window`, `document`, `localStorage`, `process`,
or `navigator`.
