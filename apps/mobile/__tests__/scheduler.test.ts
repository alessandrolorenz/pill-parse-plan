/**
 * Jest driver for the scheduler parity harness (React Native toolchain).
 *
 * The counterpart to packages/core/src/__tests__/scheduler.test.ts, which binds
 * the same harness to Vitest. Nothing here may differ except the runner globals
 * — if this file ever needs to adapt the harness, the harness is not portable
 * and that is the finding, not something to work around.
 *
 * NOTE ON WHAT THIS PROVES: jest-expo runs in Node/V8, not Hermes. A green run
 * here proves the harness contract holds under a second runner and that
 * packages/core transforms and resolves under Babel/Metro. Engine-level parity
 * is proven separately by the on-device runner in App.tsx.
 */

import { expandPlanToEvents } from '@pill-parse/core';
import { runSchedulerHarness } from '@pill-parse/core/harness';

runSchedulerHarness(expandPlanToEvents, describe, it, expect);
