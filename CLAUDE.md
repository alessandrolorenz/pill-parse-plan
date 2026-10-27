# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pills Planner (mobile display name "DoseCerta"): a user photographs a medical prescription, an OpenAI vision model extracts a structured `TreatmentPlan`, the user reviews it, and a deterministic scheduler expands it into dose events stored in Supabase, with reminders and calendar export. UI text and most docs are in Brazilian Portuguese. `ARCHITECTURE.md` has full C4/sequence/ERD diagrams.

The web app was originally scaffolded with Lovable; changes pushed to the repo sync back to the Lovable project.

## Commands

pnpm monorepo (`pnpm-workspace.yaml`: root `.`, `apps/*`, `packages/*`). Run from the repo root:

```sh
pnpm dev            # Vite web app on http://localhost:8080 (proxies /api -> localhost:3001)
pnpm server         # legacy Express server (server.js) on PORT=3001; its deps (express, cors, dotenv, web-push) are NOT in package.json
pnpm dev:full       # both
pnpm build          # production Vite build
pnpm lint           # eslint .
pnpm test           # vitest run (web src/ and packages/core tests)
pnpm exec vitest run src/test/scheduler.test.ts      # single file
pnpm exec vitest run -t "name of test"               # single test by name
pnpm exec tsc --noEmit -p tsconfig.app.json          # typecheck web

pnpm mobile:start | mobile:android | mobile:ios      # Expo dev server (apps/mobile)
pnpm mobile:build:android                            # EAS preview build
```

Quality gate used by the project before handoff: `tsc --noEmit` (web, core, mobile), `pnpm run lint`, `pnpm test`, `pnpm run build`. Root `tsconfig.json` has `files: []`, so plain `tsc --noEmit` at the root checks nothing; pass `-p`.

Setup: `cp .env.example .env`. Web reads `VITE_SUPABASE_*`, mobile reads `EXPO_PUBLIC_SUPABASE_*`; both fall back to a hardcoded Supabase project (`ekqygszihajwzeztdbqq`), which differs from `supabase/config.toml` (`qryiaiuwcqaoyjlbywfn`). The OpenAI key for the Edge Functions is a Supabase secret (`OPENAI_API_KEY`). The Express server reads `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`.

## Architecture

**Three apps share one domain package:**

- `packages/core` (`@pill-parse-plan/core`, imported as `@core/...`): framework-free domain code. `types.ts` (`TreatmentPlan`, `TreatmentItem`, `CalendarEvent`, ...), `scheduler.ts` (`expandPlanToEvents`, timezone-safe expansion of "every X hours" / "X times a day" items), `openai.ts` (`extractPlanFromImageWithClient`, a thin client for the Edge Function), and `supabase/` (typed client + generated DB types). **Scheduling logic must live only here**, so web and mobile produce the same doses. `src/lib/scheduler.ts` and `src/lib/types.ts` are just re-exports of `@core`.
- Web SPA at the repo root (`src/`): React 18 + Vite + react-router + TanStack Query, shadcn/ui (Radix + CVA) in `src/components/ui`, theme tokens as HSL CSS variables in `src/index.css` mapped in `tailwind.config.ts`. Aliases `@` → `src`, `@core` → `packages/core/src` (configured in vite, vitest and tsconfig).
- `apps/mobile`: Expo SDK 56 / React Native 0.85 / React 19, expo-router (`app/(auth)`, `app/(app)`), NativeWind v4. `lib/planStore.ts` is an in-memory store for the draft plan between `new/upload` and `new/review` (not Zustand, not persisted); `new/review.tsx` calls `expandPlanToEvents` and writes `treatments`/`events` directly. Mobile doesn't upload the prescription image yet. `lib/notifications.ts` and `lib/calendar.ts` wrap expo-notifications/expo-calendar. `metro.config.js` adds `packages/core` to `watchFolders` so Metro can resolve it.

**Prescription analysis paths.** The OpenAI key never reaches the client. The web client calls the Supabase Edge Function `analyze-prescription` (`supabase/functions/`, Deno) through `supabase.functions.invoke` in `src/lib/openai.ts`. The medical system prompt and response validation live in the Edge Function (model `gpt-4.1-2025-04-14`). There is also an older Express proxy (`server.js` + `api/openai/*.js`, model `gpt-4o`) exposing `/api/openai/analyze-prescription` and `/status`. Web Push still depends on that server: `src/lib/notifications.ts` posts to `/api/push/subscribe` and `/api/notifications/schedule` (Vite proxies `/api` to :3001), and `/internal/cron/send-due-notifications` sends due reminders. Calendar export on web is `.ics` via `src/lib/ics.ts`. `src/components/ConfigModal.tsx` is currently unused.

**Treatment persistence (web).** Pages use `useManagedTreatments`, which picks between `useSupabaseTreatments` (Supabase `treatments` + `events` tables) and `useTreatments` (localStorage fallback) and enforces plan limits from `PlanContext` (Free vs Premium, via `users.active_subscription`). Cloud mode is currently hardcoded on (`useCloud = true`, with a TODO to gate it by plan). `AuthContext` wraps Supabase auth.

**Database.** Supabase Postgres with RLS per user: `users`, `treatments`, `events` (FK cascade to treatments), `notification_reminders`, `push_subscriptions`, plus a private `prescriptions` storage bucket. Migrations are in `supabase/migrations/`; `supabase/combined_migration_for_dashboard.sql` and `fix_missing_schema.sql` are hand-applied helper scripts.

**Tests.** Vitest runs in the `node` environment. `vitest.config.ts` aliases `react-native`, `expo-notifications`, `expo-calendar`, `expo-constants` and AsyncStorage to mocks in `src/test/mocks/`, so mobile `lib/` modules can be tested from the root runner. Add new native-module mocks there.

## Domain rules

- Never infer a dose or frequency that is missing from the prescription. Lower `confidence` (< 1.0) and let the UI ask the user to confirm.
- A medical disclaimer (the app doesn't replace professional advice) must stay visible. It's inline in `src/pages/Index.tsx`, `src/components/PlanReview.tsx` and the mobile `new/review.tsx`; there is no shared `MedicalDisclaimer` component.
- `events.date`/`events.time` store the user's **local** wall-clock time. Always build rows with `toEventRow` from `@core/scheduler`, never `startISO.split('T')` (that gives UTC). Tests pin `TZ=America/Sao_Paulo` in `vitest.config.ts`.
- `durationDays` can be `null` (prescription doesn't say). Use `getPlanSchedulingIssues` to block scheduling until the user fills it in or sets `continuous` (`CONTINUOUS_HORIZON_DAYS`). Never create a treatment with zero events.
- Archive = `treatments.status = 'archived'` (frees a slot in the free plan's active limit); delete relies on `ON DELETE CASCADE` for events and reminders. On mobile, cancel that treatment's local notifications with `cancelTreatmentNotifications`.

## Specs and tooling

- `_specs/` holds feature specs (`template.md`), created with `/create-specs`; `_plans/` holds implementation plans.
- `.aicockpit/` is the original AI Cockpit config. Its skills, command and rule were copied into `.claude/` and its Storybook MCP into `.mcp.json`. Treat `.claude/` as the copy to edit. `.aicockpit/docs/lista-de-bugs-melhorias.md` is the known bugs/improvements backlog.
- Figma is the visual source of truth for layouts (desktop 1440px / mobile 375px).
