
# React Native Migration Guide — SDD Approach
## App: Tratamento por Receita (pill-parse-plan)

> **Context**: This guide is written specifically for the `pill-parse-plan` codebase — a medical prescription parsing app built with React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase + OpenAI Vision API. The goal is to produce a React Native version that preserves all behavioral contracts while adapting to native platform capabilities.

---

## Table of Contents

1. [Migration Strategy](#1-migration-strategy)
2. [SDD Architecture for Migration](#2-sdd-architecture-for-migration)
3. [Harness Design](#3-harness-design)
4. [Incremental Migration Plan](#4-incremental-migration-plan)
5. [Shared Code Strategy](#5-shared-code-strategy)
6. [Regression and Parity Validation](#6-regression-and-parity-validation)

---

## 1. Migration Strategy

### 1.1 Parallel Distribution vs. Evolutionary Branch

| Dimension | Parallel Distribution | Evolutionary Branch |
|---|---|---|
| **Definition** | Both apps share a monorepo and evolve together; features ship to both simultaneously | RN app starts as a behavioral clone, then diverges to exploit native capabilities |
| **Code sharing** | Maximum — shared business logic, hooks, API clients | Selective — only pure domain logic is shared |
| **Release cadence** | Coupled — one PR ships to both platforms | Decoupled — each platform has its own release cycle |
| **Risk** | Higher — a breaking change in shared code breaks both | Lower — platforms are isolated after the initial clone |
| **Maintenance cost** | Lower long-term if discipline is maintained | Higher long-term (two codebases) |
| **Best for** | Teams with strong monorepo discipline | Teams that want to move fast on mobile without web constraints |

### 1.2 Recommendation for pill-parse-plan

**Use a hybrid approach: Evolutionary Branch with a Shared Core Package.**

Rationale specific to this codebase:

- [`src/lib/scheduler.ts`](../src/lib/scheduler.ts:3) — `expandPlanToEvents` is a **pure function** with zero platform dependencies. It must be shared verbatim.
- [`src/lib/types.ts`](../src/lib/types.ts:1) — `TreatmentItem`, `TreatmentPlan`, `CalendarEvent`, `TreatmentRecord` are **platform-agnostic contracts**. They must be shared.
- [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx:18) — Uses `window.location.origin` (line 63, 84, 99), which is web-only. The **Supabase client logic** is shareable but the redirect URL strategy must be platform-adapted.
- [`src/components/ImagePicker.tsx`](../src/components/ImagePicker.tsx) — Uses `<input type="file">` and `FileReader` API. Must be **fully rewritten** for RN using `expo-image-picker` or `react-native-image-picker`.
- [`src/lib/ics.ts`](../src/lib/ics.ts) — ICS calendar export is a **web-only feature**. The RN equivalent is native calendar integration via `expo-calendar`.
- [`src/lib/notifications.ts`](../src/lib/notifications.ts) — Web Push Notifications → replaced by `expo-notifications` (local + push).
- All `shadcn/ui` components (`src/components/ui/`) — **100% web-only**. Must be replaced with RN equivalents (React Native Paper, NativeBase, or custom).

### 1.3 Decision Tree

```
Is the module a pure function with no DOM/browser/RN APIs?
  YES → Share it in packages/core
  NO  → Does it use only Supabase JS SDK (no window.location)?
    YES → Share it in packages/api
    NO  → Does it contain business logic wrapped in a React hook?
      YES → Extract logic to packages/core, write platform-specific hook adapters
      NO  → Rewrite for each platform
```

---

## 2. SDD Architecture for Migration

### 2.1 What SDD Means in This Context

Software-Driven Development (SDD) for a migration means: **the specification is the source of truth, not the existing code**. You extract behavioral contracts from the web app, encode them as specs, and use those specs to drive both the validation of the existing app and the implementation of the RN app.

The SDD cycle for migration:

```
Existing Web App
      │
      ▼
Extract Behavioral Contracts (specs)
      │
      ▼
Write Harnesses against contracts
      │
      ├──► Validate Web App passes harnesses (baseline)
      │
      └──► Drive RN implementation until harnesses pass
```

### 2.2 Spec Structure for This App

Each spec lives in `_specs/` and follows this extended template for migration:

```
_specs/
  core/
    scheduler.spec.md          ← Pure logic specs
    types.spec.md              ← Domain type contracts
  features/
    auth.spec.md               ← Authentication flow
    treatment-management.spec.md
    prescription-analysis.spec.md
    schedule-view.spec.md
    plan-restrictions.spec.md
  platform/
    image-capture.web.spec.md  ← Web-specific behavior
    image-capture.rn.spec.md   ← RN-specific behavior
    notifications.web.spec.md
    notifications.rn.spec.md
    calendar-export.web.spec.md
    calendar-export.rn.spec.md
```

### 2.3 Example Spec: Scheduler (Core)

```markdown
# Spec: Treatment Scheduler

branch: aicockpit/core/scheduler
platform: universal (web + RN)

## Summary
Given a TreatmentPlan and a start DateTime, produce a sorted list of
CalendarEvents representing every dose/care action for the full treatment duration.

## Functional Requirements

### FR-SCH-01: everyHours frequency
Given item.frequency.everyHours = N and item.durationDays = D,
generate events at intervals of N hours starting from startDateTime
until startDateTime + D days (inclusive).

### FR-SCH-02: timesPerDay with preferredTimes
Given item.frequency.timesPerDay = T and item.preferredTimes = [...],
generate T events per day using the provided times for each of D days.

### FR-SCH-03: timesPerDay without preferredTimes
Given item.frequency.timesPerDay = T and no preferredTimes,
distribute T events uniformly across 24 hours starting from startDateTime.getHours().

### FR-SCH-04: Event title format
- medication: "Tomar {name} {dose}{unit}"
- care: "Fazer {name}"

### FR-SCH-05: Event duration
Each event ends exactly 5 minutes after its start.

### FR-SCH-06: Output ordering
Events are sorted ascending by startISO.

## Acceptance Criteria
- [ ] q8h for 7 days produces exactly 21 events (or 22 if boundary inclusive)
- [ ] 3x/day for 5 days with preferredTimes produces exactly 15 events
- [ ] All events have endISO = startISO + 5 minutes
- [ ] Output is sorted ascending
- [ ] Medication title includes dose and unit
- [ ] Care title uses "Fazer" prefix

## Edge Cases
- durationDays = 0 → empty array
- preferredTimes has fewer entries than timesPerDay → use available times only
- everyHours = 24 → one event per day
```

### 2.4 Example Spec: Authentication Flow

```markdown
# Spec: Authentication

branch: aicockpit/feature/auth
platform: web (adapted for RN in auth.rn.spec.md)

## Summary
Users authenticate via email/password or Google OAuth using Supabase Auth.
Unauthenticated users are redirected to /auth (web) or AuthStack (RN).

## Functional Requirements

### FR-AUTH-01: Session persistence
On app load, restore existing session from Supabase storage.
Loading state = true until session check completes.

### FR-AUTH-02: Auth guard
If loading=false AND user=null, navigate to auth screen.

### FR-AUTH-03: Sign in
signIn(email, password) → calls supabase.auth.signInWithPassword.
On success: user state updates, navigate to home.
On error: return { error } to caller.

### FR-AUTH-04: Sign up
signUp(email, password, name?) → calls supabase.auth.signUp.
emailRedirectTo = platform-specific (web: window.location.origin, RN: deep link).

### FR-AUTH-05: Google OAuth
Web: redirect flow via supabase.auth.signInWithOAuth.
RN: in-app browser flow via expo-auth-session + supabase.auth.signInWithOAuth.

### FR-AUTH-06: Sign out
signOut() → supabase.auth.signOut() → user=null → navigate to auth screen.

## Platform Differences (RN)
- No window.location.origin → use app deep link scheme (e.g. pillparse://auth/callback)
- Google OAuth uses expo-auth-session WebBrowser instead of redirect
- Session storage: Supabase uses AsyncStorage on RN (configure via AsyncStorage adapter)

## Acceptance Criteria
- [ ] App loads with spinner while checking session
- [ ] Unauthenticated user sees auth screen
- [ ] Authenticated user sees home screen
- [ ] Sign in with valid credentials navigates to home
- [ ] Sign in with invalid credentials shows error
- [ ] Sign out clears user state and navigates to auth
```

---

## 3. Harness Design

### 3.1 Harness Taxonomy

A **harness** in this context is a test file that encodes a behavioral contract and can be run against both the web implementation and the RN implementation. There are four harness types:

| Type | Purpose | Tool |
|---|---|---|
| **Unit Harness** | Validates pure functions in isolation | Vitest (web) / Jest (RN) |
| **Integration Harness** | Validates a module against real/mock external services | Vitest + MSW / Jest + MSW |
| **Parity Harness** | Runs the same behavioral assertions against both platforms | Shared test suite imported by both |
| **E2E Harness** | Validates full user flows | Playwright (web) / Maestro or Detox (RN) |

### 3.2 Unit Harness: Scheduler

This is the highest-value harness because [`src/lib/scheduler.ts`](../src/lib/scheduler.ts:3) is a pure function that must produce identical output on both platforms.

```typescript
// packages/core/src/__tests__/scheduler.harness.ts
// This file is imported by BOTH web and RN test suites.
// It exports a function that receives the implementation under test.

import { expandPlanToEvents } from '../scheduler';
import type { TreatmentPlan } from '../types';

export function runSchedulerHarness(
  impl: typeof expandPlanToEvents,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('Scheduler Harness — FR-SCH-01: everyHours frequency', () => {
    it('q8h for 7 days produces events at 8-hour intervals', () => {
      const plan: TreatmentPlan = {
        planTitle: 'Test',
        summary: '',
        items: [{
          type: 'medication',
          name: 'Amoxicilina',
          dose: 500,
          unit: 'mg',
          route: 'VO',
          frequency: { everyHours: 8 },
          durationDays: 7
        }]
      };
      const start = new Date('2025-09-01T08:00:00-03:00');
      const events = impl(plan, start);

      // 7 days * 24h / 8h = 21 intervals → 22 events (inclusive boundary)
      expect(events.length).toBeGreaterThanOrEqual(21);
      expect(events.length).toBeLessThanOrEqual(22);

      // Verify 8-hour intervals
      for (let i = 1; i < events.length; i++) {
        const diff = new Date(events[i].startISO).getTime() 
                   - new Date(events[i-1].startISO).getTime();
        expect(diff).toBe(8 * 60 * 60 * 1000);
      }
    });

    it('events are sorted ascending by startISO', () => {
      const plan: TreatmentPlan = {
        planTitle: 'Multi',
        summary: '',
        items: [
          { type: 'medication', name: 'A', frequency: { everyHours: 12 }, durationDays: 3 },
          { type: 'medication', name: 'B', frequency: { everyHours: 8 }, durationDays: 3 }
        ]
      };
      const events = impl(plan, new Date('2025-09-01T08:00:00Z'));
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i].startISO).getTime())
          .toBeGreaterThanOrEqual(new Date(events[i-1].startISO).getTime());
      }
    });
  });

  describe('Scheduler Harness — FR-SCH-04: Event title format', () => {
    it('medication title includes dose and unit', () => {
      const plan: TreatmentPlan = {
        planTitle: 'T',
        summary: '',
        items: [{ type: 'medication', name: 'Amoxicilina', dose: 500, unit: 'mg', 
                  frequency: { everyHours: 8 }, durationDays: 1 }]
      };
      const events = impl(plan, new Date());
      expect(events[0].title).toBe('Tomar Amoxicilina 500mg');
    });

    it('care title uses Fazer prefix', () => {
      const plan: TreatmentPlan = {
        planTitle: 'T',
        summary: '',
        items: [{ type: 'care', name: 'Curativo', 
                  frequency: { timesPerDay: 1 }, durationDays: 1 }]
      };
      const events = impl(plan, new Date());
      expect(events[0].title).toBe('Fazer Curativo');
    });
  });

  describe('Scheduler Harness — FR-SCH-05: Event duration', () => {
    it('each event ends exactly 5 minutes after start', () => {
      const plan: TreatmentPlan = {
        planTitle: 'T',
        summary: '',
        items: [{ type: 'medication', name: 'X', 
                  frequency: { everyHours: 8 }, durationDays: 1 }]
      };
      const events = impl(plan, new Date());
      events.forEach(event => {
        if (event.endISO) {
          const diff = new Date(event.endISO).getTime() 
                     - new Date(event.startISO).getTime();
          expect(diff).toBe(5 * 60 * 1000);
        }
      });
    });
  });

  describe('Scheduler Harness — Edge Cases', () => {
    it('durationDays = 0 returns empty array', () => {
      const plan: TreatmentPlan = {
        planTitle: 'T',
        summary: '',
        items: [{ type: 'medication', name: 'X', 
                  frequency: { everyHours: 8 }, durationDays: 0 }]
      };
      const events = impl(plan, new Date());
      expect(events).toHaveLength(0);
    });
  });
}
```

**Web usage** (`src/__tests__/scheduler.web.test.ts`):
```typescript
import { expandPlanToEvents } from '@pill-parse/core';
import { runSchedulerHarness } from '@pill-parse/core/harnesses/scheduler';
import { describe, it, expect } from 'vitest';

runSchedulerHarness(expandPlanToEvents, describe, it, expect);
```

**RN usage** (`apps/mobile/src/__tests__/scheduler.rn.test.ts`):
```typescript
import { expandPlanToEvents } from '@pill-parse/core';
import { runSchedulerHarness } from '@pill-parse/core/harnesses/scheduler';

runSchedulerHarness(expandPlanToEvents, describe, it, expect);
```

### 3.3 Integration Harness: OpenAI Prescription Analysis

```typescript
// packages/api/src/__tests__/openai.harness.ts
// Tests the contract of extractPlanFromImage regardless of platform

import type { TreatmentPlan } from '@pill-parse/core';

export function runOpenAIHarness(
  extractPlanFromImage: (base64: string, notes?: string) => Promise<TreatmentPlan>,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('OpenAI Harness — Prescription Analysis Contract', () => {
    it('returns a valid TreatmentPlan shape', async () => {
      // Use MSW to mock the /api/analyze-prescription endpoint
      const mockBase64 = 'iVBORw0KGgo='; // minimal valid base64
      const plan = await extractPlanFromImage(mockBase64);

      expect(plan).toHaveProperty('planTitle');
      expect(plan).toHaveProperty('summary');
      expect(plan).toHaveProperty('items');
      expect(Array.isArray(plan.items)).toBe(true);
    });

    it('each item has required fields', async () => {
      const plan = await extractPlanFromImage('iVBORw0KGgo=');
      plan.items.forEach(item => {
        expect(['medication', 'care']).toContain(item.type);
        expect(typeof item.name).toBe('string');
        expect(typeof item.durationDays).toBe('number');
        expect(item.frequency).toBeDefined();
        const hasFreq = item.frequency.everyHours !== undefined 
                     || item.frequency.timesPerDay !== undefined;
        expect(hasFreq).toBe(true);
      });
    });

    it('passes userNotes to the API call', async () => {
      // Verify the notes are included in the request body
      // (validated via MSW request interceptor)
      const notes = 'Patient has penicillin allergy';
      await expect(extractPlanFromImage('iVBORw0KGgo=', notes))
        .resolves.toBeDefined();
    });
  });
}
```

### 3.4 Parity Harness: Authentication Flow

```typescript
// packages/core/src/__tests__/auth.harness.ts
// Platform-agnostic auth behavioral contract

export interface AuthHarnessAdapter {
  signIn(email: string, password: string): Promise<{ error: any }>;
  signUp(email: string, password: string, name?: string): Promise<{ error: any }>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<{ id: string; email: string } | null>;
  resetPassword(email: string): Promise<{ error: any }>;
}

export function runAuthHarness(
  adapter: AuthHarnessAdapter,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('Auth Harness — FR-AUTH-03: Sign In', () => {
    it('returns no error for valid credentials', async () => {
      const { error } = await adapter.signIn(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      );
      expect(error).toBeNull();
    });

    it('returns error for invalid credentials', async () => {
      const { error } = await adapter.signIn('bad@email.com', 'wrongpassword');
      expect(error).not.toBeNull();
    });
  });

  describe('Auth Harness — FR-AUTH-06: Sign Out', () => {
    it('clears user after sign out', async () => {
      await adapter.signIn(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      );
      await adapter.signOut();
      const user = await adapter.getCurrentUser();
      expect(user).toBeNull();
    });
  });
}
```

### 3.5 Navigation Flow Harness (E2E)

For the 4-step wizard flow (`home → upload → review → schedule`), use platform-specific E2E tools but share the **behavioral assertions**:

```typescript
// packages/core/src/__tests__/navigation-flow.harness.ts
// Describes the expected navigation contract as a state machine

export const NAVIGATION_STATES = ['home', 'upload', 'review', 'schedule'] as const;
export type AppStep = typeof NAVIGATION_STATES[number];

export interface NavigationHarnessAdapter {
  getCurrentStep(): Promise<AppStep>;
  tapNewTreatment(): Promise<void>;
  selectImage(base64: string): Promise<void>;
  tapAnalyze(): Promise<void>;
  waitForReview(): Promise<void>;
  tapGenerateSchedule(): Promise<void>;
  tapBack(): Promise<void>;
}

export function runNavigationHarness(
  adapter: NavigationHarnessAdapter,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('Navigation Harness — Happy Path', () => {
    it('home → upload on tap New Treatment', async () => {
      expect(await adapter.getCurrentStep()).toBe('home');
      await adapter.tapNewTreatment();
      expect(await adapter.getCurrentStep()).toBe('upload');
    });

    it('upload → review after image analysis', async () => {
      await adapter.selectImage('mock-base64');
      await adapter.tapAnalyze();
      await adapter.waitForReview();
      expect(await adapter.getCurrentStep()).toBe('review');
    });

    it('review → schedule after generate', async () => {
      await adapter.tapGenerateSchedule();
      expect(await adapter.getCurrentStep()).toBe('schedule');
    });

    it('back from any step returns to home', async () => {
      await adapter.tapBack();
      expect(await adapter.getCurrentStep()).toBe('home');
    });
  });
}
```

### 3.6 State Management Harness: Treatment Restrictions

```typescript
// packages/core/src/__tests__/plan-restrictions.harness.ts

export interface PlanRestrictionsAdapter {
  getActiveTreatmentCount(): number;
  getMaxActiveTreatments(): number;
  canAddTreatment(): boolean;
  canUseAdvancedAnalysis(): boolean;
  isPremium(): boolean;
}

export function runPlanRestrictionsHarness(
  adapter: PlanRestrictionsAdapter,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('Plan Restrictions Harness — Free Tier', () => {
    it('free user cannot add treatment when at limit', () => {
      // Assumes adapter is configured with free plan at max treatments
      if (!adapter.isPremium() && 
          adapter.getActiveTreatmentCount() >= adapter.getMaxActiveTreatments()) {
        expect(adapter.canAddTreatment()).toBe(false);
      }
    });

    it('premium user can always add treatments', () => {
      if (adapter.isPremium()) {
        expect(adapter.canAddTreatment()).toBe(true);
      }
    });
  });
}
```

### 3.7 Harnesses as Living Documentation

Each harness file serves as executable documentation. The pattern is:

1. **Spec** (`_specs/feature/scheduler.spec.md`) — human-readable behavioral contract
2. **Harness** (`packages/core/src/__tests__/scheduler.harness.ts`) — machine-executable contract
3. **Web test** (`apps/web/src/__tests__/scheduler.web.test.ts`) — runs harness against web impl
4. **RN test** (`apps/mobile/src/__tests__/scheduler.rn.test.ts`) — runs harness against RN impl

When a harness passes on both platforms, the feature is considered **behaviorally migrated**.

---

## 4. Incremental Migration Plan

### 4.1 Migration Phases

The phases are ordered by dependency depth and risk level. Each phase has a **harness gate** — you cannot proceed to the next phase until all harnesses for the current phase pass on both platforms.

```
Phase 0: Monorepo Setup
  └── No harness gate (infrastructure only)

Phase 1: Core Domain (Zero Risk)
  ├── packages/core: types.ts, scheduler.ts, utils.ts
  └── Harness Gate: scheduler.harness.ts passes on both platforms

Phase 2: API Layer (Low Risk)
  ├── packages/api: supabase client (platform-adapted), openai client
  └── Harness Gate: openai.harness.ts passes with MSW mocks

Phase 3: Authentication (Medium Risk)
  ├── apps/mobile: AuthContext.rn.tsx (AsyncStorage + deep links)
  └── Harness Gate: auth.harness.ts passes on RN

Phase 4: Treatment Management (Medium Risk)
  ├── apps/mobile: useManagedTreatments.rn.ts
  ├── apps/mobile: TreatmentCard.rn.tsx
  └── Harness Gate: plan-restrictions.harness.ts passes on RN

Phase 5: Image Capture + AI Analysis (High Risk)
  ├── apps/mobile: ImagePicker.rn.tsx (expo-image-picker)
  ├── apps/mobile: openai integration (same API, different image encoding)
  └── Harness Gate: openai.harness.ts passes with real device image

Phase 6: Schedule View (Medium Risk)
  ├── apps/mobile: ScheduleView.rn.tsx
  ├── apps/mobile: native calendar integration (expo-calendar)
  └── Harness Gate: navigation-flow.harness.ts passes end-to-end

Phase 7: Plan/Subscription (Low Risk)
  ├── apps/mobile: PlanContext.rn.tsx
  ├── apps/mobile: PlanRestrictionModal.rn.tsx
  └── Harness Gate: plan-restrictions.harness.ts passes with premium scenarios

Phase 8: Notifications (Platform-Specific)
  ├── apps/mobile: expo-notifications integration
  └── Harness Gate: manual QA (notifications cannot be fully automated)
```

### 4.2 Phase 1 Detail: Core Domain

**What to do:**
1. Create `packages/core/src/types.ts` — copy verbatim from [`src/lib/types.ts`](../src/lib/types.ts:1)
2. Create `packages/core/src/scheduler.ts` — copy verbatim from [`src/lib/scheduler.ts`](../src/lib/scheduler.ts:3)
3. Create `packages/core/src/utils.ts` — copy verbatim from [`src/lib/utils.ts`](../src/lib/utils.ts)
4. Update web app to import from `@pill-parse/core` instead of `@/lib/`
5. Write `packages/core/src/__tests__/scheduler.harness.ts`
6. Run harness on web — must pass before proceeding

**Risk**: Zero. These are pure functions with no side effects.

### 4.3 Phase 5 Detail: Image Capture (Highest Risk)

This is the most complex phase because image handling differs fundamentally:

| Aspect | Web | React Native |
|---|---|---|
| Image source | `<input type="file">` or camera via `getUserMedia` | `expo-image-picker` (gallery + camera) |
| Image format | `FileReader.readAsDataURL()` → base64 string | `ImagePicker.launchImageLibraryAsync()` → `uri` |
| Base64 extraction | `atob()` + `Uint8Array` (see [`src/pages/Index.tsx:79-89`](../src/pages/Index.tsx:79)) | `FileSystem.readAsStringAsync(uri, { encoding: 'base64' })` |
| Upload to Supabase | `File` object → `supabase.storage.from().upload()` | `ArrayBuffer` from `fetch(uri)` → `supabase.storage.from().upload()` |

**Harness for image encoding parity:**
```typescript
// packages/core/src/__tests__/image-encoding.harness.ts
export function runImageEncodingHarness(
  encodeImage: (source: unknown) => Promise<string>,
  describe: jest.Describe,
  it: jest.It,
  expect: jest.Expect
) {
  describe('Image Encoding Harness', () => {
    it('produces a valid base64 string', async () => {
      const base64 = await encodeImage(/* platform-specific source */);
      expect(typeof base64).toBe('string');
      
      // base64 regex: only valid base64 characters
      expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('base64 string can be decoded without error', async () => {
      const base64 = await encodeImage(/* platform-specific source */);
      expect(() => atob(base64)).not.toThrow();
    });
  });
}
```

---

## 5. Shared Code Strategy

### 5.1 Monorepo Structure

Use **pnpm workspaces** (already in the project via `pnpm-lock.yaml`) with **Turborepo** for build orchestration.

```
pill-parse-plan/                    ← existing repo root
├── apps/
│   ├── web/                        ← existing Vite + React app (moved here)
│   │   ├── src/
│   │   │   ├── components/         ← web-only (shadcn/ui)
│   │   │   ├── pages/
│   │   │   ├── contexts/           ← web-specific adapters
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── mobile/                     ← NEW: React Native (Expo)
│       ├── src/
│       │   ├── components/         ← RN-specific components
│       │   ├── screens/            ← RN screens (≈ pages/)
│       │   ├── contexts/           ← RN-specific adapters
│       │   └── App.tsx
│       ├── app.json
│       └── package.json
├── packages/
│   ├── core/                       ← SHARED: pure domain logic
│   │   ├── src/
│   │   │   ├── types.ts            ← TreatmentItem, TreatmentPlan, etc.
│   │   │   ├── scheduler.ts        ← expandPlanToEvents (pure function)
│   │   │   ├── utils.ts            ← cn(), date helpers
│   │   │   └── __tests__/
│   │   │       ├── scheduler.harness.ts
│   │   │       ├── auth.harness.ts
│   │   │       ├── plan-restrictions.harness.ts
│   │   │       └── navigation-flow.harness.ts
│   │   ├── package.json            ← name: "@pill-parse/core"
│   │   └── tsconfig.json
│   ├── api/                        ← SHARED: API clients (platform-adapted)
│   │   ├── src/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       ← supabase client factory
│   │   │   │   └── types.ts        ← DB types (shared verbatim)
│   │   │   ├── openai/
│   │   │   │   ├── extractPlan.ts  ← extractPlanFromImage (platform-agnostic)
│   │   │   │   └── types.ts
│   │   │   └── __tests__/
│   │   │       └── openai.harness.ts
│   │   ├── package.json            ← name: "@pill-parse/api"
│   │   └── tsconfig.json
│   └── hooks/                      ← SHARED: business logic hooks
│       ├── src/
│       │   ├── useTreatments.ts    ← platform-agnostic treatment logic
│       │   ├── usePlan.ts          ← plan restriction logic
│       │   └── __tests__/
│       │       └── useTreatments.harness.ts
│       ├── package.json            ← name: "@pill-parse/hooks"
│       └── tsconfig.json
├── _specs/                         ← SDD specs (existing)
├── _plans/                         ← SDD plans (existing)
├── pnpm-workspace.yaml             ← NEW
├── turbo.json                      ← NEW
└── package.json                    ← root workspace config
```

### 5.2 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 5.3 What Goes Where

#### packages/core — Zero Platform Dependencies

| Web source | Shared as | Notes |
|---|---|---|
| [`src/lib/types.ts`](../src/lib/types.ts:1) | `packages/core/src/types.ts` | Copy verbatim |
| [`src/lib/scheduler.ts`](../src/lib/scheduler.ts:3) | `packages/core/src/scheduler.ts` | Copy verbatim |
| [`src/lib/utils.ts`](../src/lib/utils.ts) | `packages/core/src/utils.ts` | Remove `clsx`/`tailwind-merge` if not needed in RN |

#### packages/api — Supabase + OpenAI (Platform-Adapted)

The Supabase JS SDK works on both web and RN, but requires platform-specific storage adapters:

```typescript
// packages/api/src/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Platform adapter injected at app startup
let storageAdapter: any = undefined;

export function initSupabaseClient(platformStorage?: any) {
  storageAdapter = platformStorage;
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: storageAdapter, // undefined = localStorage (web), AsyncStorage (RN)
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // RN: use deep link handler instead
    }
  }
);
```

**Web app initialization** (`apps/web/src/main.tsx`):
```typescript
import { initSupabaseClient } from '@pill-parse/api';
initSupabaseClient(); // uses localStorage by default
```

**RN app initialization** (`apps/mobile/src/App.tsx`):
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSupabaseClient } from '@pill-parse/api';
initSupabaseClient(AsyncStorage);
```

#### packages/hooks — Business Logic Hooks

Extract the non-UI logic from [`src/hooks/useManagedTreatments.ts`](../src/hooks/useManagedTreatments.ts) into a platform-agnostic hook:

```typescript
// packages/hooks/src/useTreatments.ts
// This hook contains ONLY business logic — no React Native or web-specific APIs

import { useCallback } from 'react';
import type { TreatmentPlan, TreatmentRecord } from '@pill-parse/core';
import { expandPlanToEvents } from '@pill-parse/core';

export interface TreatmentStorageAdapter {
  getAll(): Promise<TreatmentRecord[]>;
  save(record: TreatmentRecord): Promise<string>;
  update(id: string, updates: Partial<TreatmentRecord>): Promise<void>;
  delete(id: string): Promise<void>;
}

export function useTreatmentsCore(adapter: TreatmentStorageAdapter) {
  const addTreatment = useCallback(async (
    plan: TreatmentPlan,
    startDate: Date,
    imagePath?: string
  ): Promise<string> => {
    const events = expandPlanToEvents(plan, startDate);
    const record: TreatmentRecord = {
      id: crypto.randomUUID(),
      plan,
      events,
      startDateTime: startDate,
      createdAt: new Date(),
      status: 'active',
      completedEvents: {}
    };
    return adapter.save(record);
  }, [adapter]);

  return { addTreatment };
}
```

**Web adapter** (`apps/web/src/hooks/useManagedTreatments.ts`):
```typescript
import { useTreatmentsCore } from '@pill-parse/hooks';
import { supabaseStorageAdapter } from './adapters/supabaseAdapter';
import { localStorageAdapter } from './adapters/localStorageAdapter';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';

export function useManagedTreatments() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const adapter = isPremium && user ? supabaseStorageAdapter : localStorageAdapter;
  return useTreatmentsCore(adapter);
}
```

**RN adapter** (`apps/mobile/src/hooks/useManagedTreatments.rn.ts`):
```typescript
import { useTreatmentsCore } from '@pill-parse/hooks';
import { supabaseStorageAdapter } from './adapters/supabaseAdapter';
import { asyncStorageAdapter } from './adapters/asyncStorageAdapter';
import { useAuth } from '../contexts/AuthContext.rn';
import { usePlan } from '../contexts/PlanContext.rn';

export function useManagedTreatments() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const adapter = isPremium && user ? supabaseStorageAdapter : asyncStorageAdapter;
  return useTreatmentsCore(adapter);
}
```

### 5.4 Platform-Specific Rewrites (No Sharing)

These modules must be **fully rewritten** for RN with no code sharing:

| Web module | RN replacement | Key difference |
|---|---|---|
| [`src/components/ImagePicker.tsx`](../src/components/ImagePicker.tsx) | `ImagePicker.rn.tsx` | `expo-image-picker` vs `<input type="file">` |
| [`src/lib/ics.ts`](../src/lib/ics.ts) | `calendarIntegration.rn.ts` | `expo-calendar` vs ICS file download |
| [`src/lib/notifications.ts`](../src/lib/notifications.ts) | `notifications.rn.ts` | `expo-notifications` vs Web Push API |
| `react-router-dom` navigation | `@react-navigation/native` | Stack/Tab navigators vs URL routing |
| All `shadcn/ui` components | React Native Paper or custom | No DOM in RN |
| `next-themes` dark mode | `useColorScheme()` from RN | System-level theme detection |
| `sonner` toasts | `react-native-toast-message` | Platform-native toasts |

---

## 6. Regression and Parity Validation

### 6.1 Parity Matrix

Track migration progress with a parity matrix. Each row is a behavioral contract; each column is a platform. A cell is ✅ when the harness passes.

| Behavioral Contract | Harness File | Web | RN |
|---|---|---|---|
| Scheduler: everyHours frequency | `scheduler.harness.ts` | ✅ | ⬜ |
| Scheduler: timesPerDay + preferredTimes | `scheduler.harness.ts` | ✅ | ⬜ |
| Scheduler: event title format | `scheduler.harness.ts` | ✅ | ⬜ |
| Scheduler: event duration 5min | `scheduler.harness.ts` | ✅ | ⬜ |
| Auth: sign in valid credentials | `auth.harness.ts` | ✅ | ⬜ |
| Auth: sign in invalid credentials | `auth.harness.ts` | ✅ | ⬜ |
| Auth: sign out clears user | `auth.harness.ts` | ✅ | ⬜ |
| Auth: session persistence on reload | `auth.harness.ts` | ✅ | ⬜ |
| OpenAI: returns valid TreatmentPlan shape | `openai.harness.ts` | ✅ | ⬜ |
| OpenAI: each item has required fields | `openai.harness.ts` | ✅ | ⬜ |
| Navigation: home → upload | `navigation-flow.harness.ts` | ✅ | ⬜ |
| Navigation: upload → review | `navigation-flow.harness.ts` | ✅ | ⬜ |
| Navigation: review → schedule | `navigation-flow.harness.ts` | ✅ | ⬜ |
| Navigation: back returns to home | `navigation-flow.harness.ts` | ✅ | ⬜ |
| Plan: free user at limit cannot add | `plan-restrictions.harness.ts` | ✅ | ⬜ |
| Plan: premium user can always add | `plan-restrictions.harness.ts` | ✅ | ⬜ |
| Image: base64 encoding produces valid string | `image-encoding.harness.ts` | ✅ | ⬜ |

### 6.2 CI/CD Pipeline for Parity

```yaml
# .github/workflows/parity-check.yml
name: Behavioral Parity Check

on: [push, pull_request]

jobs:
  web-harnesses:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter @pill-parse/core test
      - run: pnpm --filter @pill-parse/api test
      - run: pnpm --filter @pill-parse/hooks test
      - run: pnpm --filter web test

  rn-harnesses:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter mobile test

  parity-gate:
    needs: [web-harnesses, rn-harnesses]
    runs-on: ubuntu-latest
    steps:
      - name: All parity harnesses passed
        run: echo "Both platforms pass all behavioral contracts"
```

### 6.3 Contract Testing with MSW

Use **Mock Service Worker (MSW)** to mock the `/api/analyze-prescription` endpoint in both environments, ensuring the same mock response is used for both web and RN harnesses:

```typescript
// packages/api/src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { TreatmentPlan } from '@pill-parse/core';

const mockPlan: TreatmentPlan = {
  planTitle: 'Otite – Amoxicilina',
  summary: 'Antibiótico para otite média',
  items: [{
    type: 'medication',
    name: 'Amoxicilina',
    dose: 500,
    unit: 'mg',
    route: 'VO',
    frequency: { everyHours: 8 },
    durationDays: 7,
    confidence: 0.95
  }]
};

export const handlers = [
  http.post('/api/analyze-prescription', () => {
    return HttpResponse.json(mockPlan);
  })
];
```

### 6.4 Snapshot Testing for Behavioral Regression

For the scheduler (pure function), use snapshot testing to catch any unintended behavioral changes during refactoring:

```typescript
// packages/core/src/__tests__/scheduler.snapshot.test.ts
import { expandPlanToEvents } from '../scheduler';
import type { TreatmentPlan } from '../types';

describe('Scheduler Snapshots — Regression Guard', () => {
  it('q8h 7-day plan matches snapshot', () => {
    const plan: TreatmentPlan = {
      planTitle: 'Amoxicilina 7 dias',
      summary: '',
      items: [{
        type: 'medication',
        name: 'Amoxicilina',
        dose: 500,
        unit: 'mg',
        frequency: { everyHours: 8 },
        durationDays: 7
      }]
    };
    // Fixed date to make snapshot deterministic
    const start = new Date('2025-09-01T08:00:00.000Z');
    const events = expandPlanToEvents(plan, start);
    expect(events).toMatchSnapshot();
  });
});
```

**Critical rule**: Never update snapshots without a corresponding spec change. Snapshot updates require a PR comment explaining why the behavioral output changed.

### 6.5 The Parity Validation Workflow

```
Step 1: Before starting a phase
  └── Run all existing harnesses on web → all must pass (baseline)

Step 2: Implement RN module
  └── Write RN implementation guided by the spec

Step 3: Run harnesses on RN
  └── If harness fails → fix RN implementation (NOT the harness)
  └── If harness passes → mark parity matrix cell as ✅

Step 4: Code review gate
  └── PR cannot merge unless:
      a) All harnesses pass on both platforms
      b) Parity matrix is updated
      c) No snapshot updates without spec justification

Step 5: After phase completion
  └── Update parity matrix in _plans/rn-migration-sdd-guide.md
  └── Tag the commit with the phase number (e.g. git tag phase-1-complete)
```

### 6.6 Detecting Behavioral Drift Over Time

After the initial migration, use this strategy to prevent the two apps from diverging unintentionally:

1. **Shared harnesses in CI**: Both apps run the same harness suite on every PR. If a web change breaks a harness, the RN team is immediately notified (and vice versa).

2. **Spec-first changes**: Any new feature or bug fix must start with a spec update in `_specs/`. The spec is reviewed before any code is written.

3. **Harness-first implementation**: New behavior is only considered implemented when the harness passes on both platforms (or the spec explicitly marks a behavior as platform-specific).

4. **Divergence log**: Maintain a `_plans/platform-divergences.md` file that explicitly documents every intentional behavioral difference between web and RN (e.g., "RN uses native calendar instead of ICS download"). This makes unintentional drift visible.

---

## Appendix A: React Native Component Mapping

| Web (shadcn/ui) | React Native equivalent | Notes |
|---|---|---|
| `<Button>` | `<Pressable>` + custom styles | Or React Native Paper `<Button>` |
| `<Card>` | `<View>` with shadow styles | `elevation` on Android, `shadowColor` on iOS |
| `<Tabs>` | `@react-navigation/material-top-tabs` | Or custom tab bar |
| `<Textarea>` | `<TextInput multiline>` | |
| `<Badge>` | Custom `<View>` + `<Text>` | |
| `<Dialog>` | `<Modal>` | React Native built-in |
| `<Select>` | `<Picker>` or `ActionSheet` | Platform-specific UX |
| `<Loader2>` (spin) | `<ActivityIndicator>` | Built-in RN |
| `<AlertTriangle>` | `@expo/vector-icons` or SVG | |
| `<Pill>` (lucide) | `@expo/vector-icons` or SVG | |
| `useToast` (sonner) | `react-native-toast-message` | |
| `useNavigate` (react-router) | `useNavigation` (@react-navigation) | |

---

## Appendix B: SDD Workflow Summary

```
1. SPEC FIRST
   Write _specs/feature/X.spec.md before any code
   Define: inputs, outputs, edge cases, acceptance criteria

2. HARNESS SECOND
   Write packages/core/src/__tests__/X.harness.ts
   Encode every acceptance criterion as an executable assertion

3. BASELINE THIRD
   Run harness against web app → all must pass
   This proves the web app already satisfies the spec

4. IMPLEMENT FOURTH
   Write RN implementation guided by the spec
   Do NOT look at web implementation for UI — only for business logic

5. VALIDATE FIFTH
   Run harness against RN implementation
   Iterate until all assertions pass

6. DOCUMENT SIXTH
   Update parity matrix
   Commit with message: "feat(mobile): phase-N complete — X harnesses passing"
```

---

## Appendix C: Key Files to Migrate (Priority Order)

| Priority | Web file | Action | Shared package |
|---|---|---|---|
| 1 | [`src/lib/types.ts`](../src/lib/types.ts:1) | Copy to `packages/core` | `@pill-parse/core` |
| 2 | [`src/lib/scheduler.ts`](../src/lib/scheduler.ts:3) | Copy to `packages/core` | `@pill-parse/core` |
| 3 | [`src/lib/utils.ts`](../src/lib/utils.ts) | Copy to `packages/core` | `@pill-parse/core` |
| 4 | [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts) | Copy to `packages/api` | `@pill-parse/api` |
| 5 | [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts) | Adapt to `packages/api` | `@pill-parse/api` |
| 6 | [`src/lib/openai.ts`](../src/lib/openai.ts) | Adapt to `packages/api` | `@pill-parse/api` |
| 7 | [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx:18) | Rewrite for RN | `apps/mobile` |
| 8 | [`src/contexts/PlanContext.tsx`](../src/contexts/PlanContext.tsx) | Rewrite for RN | `apps/mobile` |
| 9 | [`src/hooks/useManagedTreatments.ts`](../src/hooks/useManagedTreatments.ts) | Extract core to `packages/hooks` | `@pill-parse/hooks` |
| 10 | [`src/components/ImagePicker.tsx`](../src/components/ImagePicker.tsx) | Full rewrite for RN | `apps/mobile` |
| 11 | [`src/components/PlanReview.tsx`](../src/components/PlanReview.tsx) | Rewrite UI for RN | `apps/mobile` |
| 12 | [`src/components/SupabaseScheduleView.tsx`](../src/components/SupabaseScheduleView.tsx) | Rewrite UI for RN | `apps/mobile` |
| 13 | [`src/lib/notifications.ts`](../src/lib/notifications.ts) | Full rewrite with expo-notifications | `apps/mobile` |
| 14 | [`src/lib/ics.ts`](../src/lib/ics.ts) | Replace with expo-calendar | `apps/mobile` |