# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**Tratamento por Receita** (`pill-parse-plan`) — a pt-BR medical app. The user photographs a
prescription; OpenAI Vision extracts a structured `TreatmentPlan`; the plan is expanded into
per-dose calendar events that the user tracks, exports as `.ics`, and gets push reminders for.

The core pipeline is worth internalizing before changing anything:

```
image (base64)
  → src/lib/openai.ts  → Supabase Edge Function `analyze-prescription` → TreatmentPlan
  → packages/core expandPlanToEvents(plan, startDateTime) → CalendarEvent[]
  → persistence (Supabase `treatments` + `events`) → SupabaseScheduleView
  → src/lib/ics.ts (export) / src/lib/notifications.ts (push)
```

`packages/core/src/types.ts` holds the contracts for every stage (`TreatmentItem`,
`TreatmentPlan`, `CalendarEvent`, `TreatmentRecord`). Change a type there and the whole pipeline
moves with it.

This project was generated on **Lovable** and stays synced with it; pushes to the repo are
reflected in the Lovable project and vice versa. `lovable-tagger` runs as a Vite plugin in dev mode.

## Commands

Package manager is **npm** (`package-lock.json` is the live lockfile — `bun.lockb` and
`pnpm-lock.yaml` are stale Lovable leftovers; don't use or update them).

```sh
npm run dev            # Vite dev server on :8080
npm run server         # Express API on :3001  (currently broken — see gotchas)
npm run dev:full       # both
npm run build          # production build (~40s; the 563 kB chunk warning is expected)
npm run lint           # eslint — already red, see below
npm run test           # vitest (web), watch mode
npm run test:run       # vitest (web), single run — 25 tests, all green
npm run test:mobile    # jest (RN toolchain), same 25 assertions via the shared harness
npm run script:sync               # all three Figma syncs
npm run script:sync-tokens        # Figma design tokens → src/index.css
npm run script:sync-text-styles   # Figma text styles
npm run script:sync-icons         # Figma icons
```

**Test coverage is Vitest over `packages/core` only** — the domain layer. Everything above it
(hooks, components, pages, the two backends) is still unharnessed, so verification for changes
outside `packages/core` means `npm run build`, reading the lint *delta*, and exercising the flow
in the browser.

**`npm run lint` fails on a clean tree**: 33 errors and 13 warnings, mostly `no-explicit-any` in
generated `src/components/ui/*` files plus `no-require-imports` in `tailwind.config.ts`. Don't read
a red lint run as your own regression, and don't clean the baseline as a drive-by. Compare counts
before and after instead.

The Figma sync scripts need `FIGMA_TOKEN` in the environment — it is **not** in `.env`, so they
fail out of the box. The target file is hardcoded (`FIGMA_FILE_KEY` in `scripts/figma-config.ts`,
file `Parser`), as is the Figma-variable → CSS-custom-property map.

## Architecture notes

### `packages/core` is the shared domain layer

The repo is an **npm workspace** (`workspaces: ["packages/*", "apps/*"]` — npm, not pnpm;
`pnpm-lock.yaml` is still a stale leftover). `@pill-parse/core` holds `types.ts` and
`scheduler.ts`, resolved via an alias in `vite.config.ts` and both tsconfigs. Import domain types
and the scheduler from `@pill-parse/core`, never by relative path.

**Nothing in `packages/core` may touch a browser, Node, or React Native API — and that includes
`Intl` / `toLocale*`.** Hermes delegates those to platform ICU on Android, so locale output can
differ by device, breaking parity in a way no Node-based test would catch. `formatEventForDisplay`
was deleted for exactly this reason. `src/lib/utils.ts` (`cn()`, over `clsx` + `tailwind-merge`)
stayed with the web app on the same principle, contrary to the migration guide's Appendix C.

Behavior is governed by specs in `_specs/core/`, enforced by
`packages/core/src/testing/scheduler.harness.ts`. **Change the spec before changing scheduler
behavior** — acceptance criteria are pinned to exact numbers on purpose, and
`_specs/parity-matrix.md` tracks what is verified on which platform.

The harness takes `(impl, describe, it, expect)` instead of importing a runner, so one file drives
**three** drivers:

| Driver | Runner | Engine | Command |
|---|---|---|---|
| `packages/core/src/__tests__/scheduler.test.ts` | Vitest | Node/V8 | `npm run test:run` |
| `apps/mobile/__tests__/scheduler.test.ts` | Jest (`jest-expo`) | Node/V8 | `npm run test:mobile` |
| `apps/mobile/App.tsx` + `src/harnessRunner.ts` | hand-rolled collector | **Hermes** | `npx expo start`, open in Expo Go |

It is exported as `@pill-parse/core/harness` and **must stay out of `__tests__/`** — Metro's
default blockList is `/\\__tests__\\.*$/`, so anything there is invisible to the RN bundler and
fails with a baffling "file does not exist" for a file that plainly exists.

### `apps/mobile` — the React Native app

Expo SDK 57 / RN 0.86 / React 19, currently a harness screen and nothing else: it runs the
scheduler contract on Hermes and renders pass/fail. Phase 3+ builds real screens around it.

Two workspace gotchas, both already handled in `apps/mobile/metro.config.js`:

- Metro needs `watchFolders` + `nodeModulesPaths` pointed at the workspace root, or it will not
  follow the `@pill-parse/core` symlink.
- **Leave `disableHierarchicalLookup` off.** Expo's monorepo guide suggests enabling it, which
  suits a flat pnpm store. npm nests Expo's own dependencies under
  `apps/mobile/node_modules/expo/node_modules/*` (the web app pins React 18, this app is on 19),
  and disabling hierarchical lookup makes those unreachable — the bundle dies on `expo-asset`.

`npx expo install` **does not work here**: it detects the stale root `bun.lockb` and shells out to
`bun`, which is not installed. Install with `npm install -D -w mobile <pkg>@<version>` instead —
`expo install` still prints the SDK-correct versions before it fails, which is a convenient way to
look them up.

### Two backends exist; only one is on the frontend's hot path

- **Supabase Edge Functions** (`supabase/functions/`) — what the app actually calls for AI.
  `src/lib/openai.ts` and `ConfigModal.tsx` use `supabase.functions.invoke(...)`.
  `OPENAI_API_KEY` must be set as a **Supabase secret**, not just in `.env`.
- **Express server** (`server.js` + `api/openai/*.js`) — serves `/api/push/subscribe`,
  `/api/notifications/schedule`, `/internal/cron/send-due-notifications`, `/api/health`, plus a
  **duplicate** OpenAI handler (`/api/openai/analyze-prescription`, `/api/openai/status`) that
  nothing in `src/` calls. Vite proxies `/api` → `localhost:3001`.

`supabase/functions/analyze-prescription/index.ts` and `api/openai/analyze-prescription.js` carry a
byte-identical `SYSTEM_PROMPT` but have **already drifted on model**: the Edge Function calls
`gpt-4.1-2025-04-14` via raw `fetch`, the Express copy calls `gpt-4o` via the `openai` SDK. The
Edge Function is the one that matters in practice; change both or neither.

### Screen flow lives in one state variable

`src/pages/Index.tsx` is a ~490-line state machine over
`type AppStep = 'home' | 'upload' | 'review' | 'schedule'`, holding the in-flight image, plan, and
start datetime as local state. There is no route per step and no draft persistence — a reload
mid-flow drops everything. Routing (`src/App.tsx`) is only `/`, `/auth`, `/profile`, `*`; there is
no guard component, each page redirects to `/auth` from its own `useEffect` when `user` is null.

### Dual persistence behind one hook

`useManagedTreatments` is the only treatment hook pages should use. It picks between:

- `useTreatments` — localStorage, `TreatmentRecord` shape, events embedded in the record
- `useSupabaseTreatments` — Supabase, normalized `treatments` + `events` rows

**`useCloud` is currently hardcoded `true`** ([useManagedTreatments.ts:20](src/hooks/useManagedTreatments.ts#L20)),
with the plan-gated branch commented out above it. The localStorage path is therefore dead in the
running app. Don't "fix" a bug in `useTreatments` expecting it to change behavior.

The two shapes are not equivalent: an `events` row is only `{date, time, label, done}`, so a
round-trip through Supabase **loses** `CalendarEvent.description` and `endISO`.
`SupabaseScheduleView` reconstructs them (`description` becomes `Tratamento: <title>`, `endISO`
becomes `undefined`) before handing events to `ics.ts` and `notifications.ts`.

### Plan gating

`PlanContext` reads `users.active_subscription` and exposes `features`. Right now free and premium
differ **only** in `maxActiveTreatments` (1 vs `Infinity`) — `advancedAnalysis` and `cloudStorage`
are `true` on both tiers. `useManagedTreatments.checkTreatmentRestriction()` enforces the limit;
`PlanRestrictionModal` surfaces it.

### Supabase

Project `qryiaiuwcqaoyjlbywfn`. Tables: `users`, `treatments`, `events`, `push_subscriptions`,
`notification_reminders`. Prescription images live in the private `prescriptions` storage bucket
under `{user_id}/{timestamp}.{ext}`.

RLS is per-user, but **`events` has no `user_id` column** — its policies scope through
`auth.uid() IN (SELECT user_id FROM treatments WHERE id = treatment_id)`. Anything new hanging off
`events` needs the same indirection.

`src/integrations/supabase/client.ts` and `types.ts` are **generated — do not hand-edit**. Two
things follow:

- The client **hardcodes** the project URL and anon key. The `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` entries in `.env.example` are commented out and unused; pointing the app
  at another project means regenerating that file, not editing `.env`.
- `types.ts` is **stale** — it declares only `users`, `treatments`, and `events`. Queries against
  `push_subscriptions` or `notification_reminders` are untyped. Regenerate after schema work.

### Migrations are not `supabase db push`-safe

`supabase/migrations/20251202000000_notifications.sql` contains
`CREATE POLICY ... FOR INSERT, UPDATE, DELETE`, which is invalid Postgres (a policy takes one
command). Two hand-maintained scripts work around it:

- `supabase/combined_migration_for_dashboard.sql` — all migrations concatenated with that policy
  split into three, meant to be pasted into the dashboard SQL editor.
- `supabase/fix_missing_schema.sql` — a repair script. Its header documents that the remote project
  was found holding **a different app's schema** (an Expo app with `medications`/`schedules`
  tables); it moves those into a `legacy` schema and recreates what this repo's migrations expect.

Remote and `supabase/migrations/` have diverged before and may again — verify the live schema
before assuming a column exists. `remote_schema.json` is a PostgREST OpenAPI snapshot of the remote.

### Time handling is the fragile part

This is where off-by-hours bugs come from. The round trip crosses three representations:

1. `expandPlanToEvents` builds `Date`s in **local time**, then serializes with `.toISOString()` — UTC.
2. `useSupabaseTreatments.addTreatment` splits that UTC string into `date` and `time` columns
   (`startISO.split('T')[0]` / `[1]`), dropping the `Z`.
3. `SupabaseScheduleView` reads it back as `` `${event.date}T${event.time}` `` — **no offset**, so
   `new Date()` parses it as **local** time, not the UTC it was written as.

Users are in `America/Sao_Paulo` (UTC−3) and the UI formats with `pt-BR`. Reason across all three
steps before touching scheduling, event display, or reminder timing.

### Push notifications

`index.html` registers `public/sw.js`; `src/lib/notifications.ts` subscribes via `PushManager`
using `VITE_VAPID_PUBLIC_KEY`, POSTs the subscription to the Express server, and schedules only the
**next 48 hours** of events per call. Everything server-side of that is currently non-functional —
see the gotchas.

## Conventions

- **Path alias**: `@/` → `src/`. Use it; relative `../../` imports are the exception.
- **UI language is Portuguese (pt-BR)** — all user-facing strings, toasts, and error messages.
  Code identifiers and comments are a mix of English and Portuguese; match the file you're in.
- **Styling**: Tailwind + shadcn/ui. Colors, radii, and spacing come from HSL CSS custom properties
  in `src/index.css`, mapped in `tailwind.config.ts`. **Never hardcode a color** — the Figma sync
  scripts rewrite `src/index.css` and will clobber ad-hoc values.
- **shadcn components** live in `src/components/ui/` (48 of them, mostly untouched generated code).
  App components sit directly in `src/components/`. Add new primitives via the shadcn CLI
  (`components.json` is configured) rather than hand-rolling.
- **TypeScript is deliberately loose**: `strict: false`, `strictNullChecks: false`,
  `noImplicitAny: false`, and `@typescript-eslint/no-unused-vars` is off. Don't tighten these as a
  drive-by change — it cascades across the whole codebase.
- **Commits** follow Conventional Commits with scopes (`feat:`, `chore(db):`, `build(deps):`).

## Gotchas

- **`npm run server` and `npm run dev:full` are currently broken.** `server.js` imports `express`,
  `cors`, `dotenv`, and `web-push`, none of which are in `package.json` or installed. Install them
  before touching the push/notification path.
- **Push sending is disabled server-side**: `server.js` reads `VAPID_PUBLIC_KEY`, but `.env` only
  defines `VITE_VAPID_PUBLIC_KEY` (the client-side one) and `VAPID_PRIVATE_KEY`.
- **Reminder delivery has no scheduler.** `POST /internal/cron/send-due-notifications` exists but
  nothing invokes it; it needs an external cron.
- **Dead code**: `src/components/ScheduleView.tsx` and `src/components/ConfigModal.tsx` are not
  imported anywhere. `SupabaseScheduleView` is the live one.
- **`README.md` is stale Lovable boilerplate** — its setup steps point at `npm run dev:full` and a
  local `OPENAI_API_KEY`, which is not how the app resolves the key anymore.

## Reference material

- `_plans/` — planning docs: `rn-migration-sdd-guide.md` (React Native migration strategy written
  against this exact codebase, with `prompt-0.md` as the prompt that produced it),
  `pill-parse-plan-figma-redesign.md`, `como-eu-faria-pra-synchronous-flame.md`.
- `_specs/` — `core/scheduler.spec.md` and `core/types.spec.md` are live contracts for
  `packages/core`; `parity-matrix.md` tracks which contracts are harness-verified per platform;
  `template.md` is the spec template for SDD-style work.
- `headme.md` — product notes.
- `.aicockpit/` — Figma MCP skills, a `create-specs` workflow, and a context7 usage rule. The
  skills and the context7 rule are generic and reusable.

  **`.aicockpit/docs/storybook-mcp-*.md` describes a different repository** — Figma's Simple
  Design System (`src/ui/primitives`, 27 SDS components, Storybook). None of that exists here.
  A sibling file, `rules/SDS-Instructions.md`, was deleted in 2026-09 precisely because agents
  followed it and fought this codebase: it lists Tailwind utility classes as a pitfall and
  directs imports from `primitives`/`layout`/`compositions` aliases that don't exist. Treat
  anything in `.aicockpit/` mentioning SDS, `src/ui/`, or `--sds-*` tokens as foreign. The
  intentional exception is `_plans/pill-parse-plan-figma-redesign.md`, which is a *proposal* to
  adopt SDS here and carries its own shadcn↔SDS mapping.
