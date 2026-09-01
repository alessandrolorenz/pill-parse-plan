/**
 * Vitest driver for the scheduler parity harness (web).
 *
 * This file is the only web-specific part: it binds the runner's globals to the
 * runner-agnostic harness. The React Native app gets an equivalent ~10-line Jest
 * driver that imports the same harness, which is what makes the contract shared
 * rather than duplicated.
 */

import { describe, it, expect } from 'vitest';
import { expandPlanToEvents } from '../scheduler';
import { runSchedulerHarness } from './scheduler.harness';

runSchedulerHarness(expandPlanToEvents, describe, it, expect);
