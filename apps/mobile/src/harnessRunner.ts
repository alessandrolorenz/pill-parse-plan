/**
 * A third driver for the shared harness — this one runs on-device, on Hermes.
 *
 * Jest and Vitest both run in Node/V8. Neither exercises the engine React Native
 * actually ships, so neither can prove engine-level behavioral parity. This
 * collector implements the same `(describe, it, expect)` surface the harness
 * expects, letting the identical assertion file run inside the app itself.
 *
 * The harness needed no modification to support this. That is the payoff of
 * taking the runner as a parameter instead of importing one.
 *
 * ---
 *
 * CAUTION: `toEqual` below is a minimal deep-equal, NOT a Jest-compatible one.
 * A permissive implementation would report a green run that means nothing, so it
 * is deliberately STRICT — it can produce false failures (visible, investigable)
 * but should not produce false passes (invisible, dangerous). Two things
 * establish its correctness, and neither is optional:
 *
 *   1. It must report the same 25 assertion names with the same outcomes as
 *      Vitest and Jest.
 *   2. Breaking one expected value in the harness must turn this runner red too.
 *
 * Unsupported types throw rather than returning false, so an unhandled shape
 * surfaces as a loud error instead of a silent mismatch.
 */

export interface AssertionResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export interface HarnessRun {
  results: AssertionResult[];
  passed: number;
  failed: number;
  engine: string;
}

function describeValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value instanceof Set) return `Set(${JSON.stringify([...value])})`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set)) return false;
    if (a.size !== b.size) return false;
    // The harness only builds Sets of strings (AC-08), so identity `has` is
    // correct here. Guard it so that stops being silently assumed.
    for (const value of a) {
      if (typeof value !== 'string') {
        throw new Error('harnessRunner: Set deep-equal supports strings only');
      }
      if (!b.has(value)) return false;
    }
    return true;
  }

  if (a instanceof Map || b instanceof Map) {
    throw new Error('harnessRunner: Map comparison is not implemented');
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }

  if (a instanceof Date || b instanceof Date) {
    if (!(a instanceof Date) || !(b instanceof Date)) return false;
    return a.getTime() === b.getTime();
  }

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/** Detects the JS engine, so a green run cannot be mistaken for a V8 run. */
function detectEngine(): string {
  const hermes = (globalThis as { HermesInternal?: unknown }).HermesInternal;
  if (hermes == null) return 'JSC / V8 (not Hermes)';

  const version = (
    hermes as { getRuntimeProperties?: () => Record<string, string> }
  ).getRuntimeProperties?.()?.['OSS Release Version'];

  return version ? `Hermes ${version}` : 'Hermes';
}

/**
 * Runs a harness and collects every assertion outcome.
 *
 * @param harness a function with the shape of `runSchedulerHarness`
 * @param impl    the implementation under test, passed through untouched
 */
export function collectHarnessRun<T>(
  harness: (
    impl: T,
    describe: (name: string, fn: () => void) => void,
    it: (name: string, fn: () => void) => void,
    expect: (actual: unknown) => {
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
    }
  ) => void,
  impl: T
): HarnessRun {
  const results: AssertionResult[] = [];
  const suiteStack: string[] = [];

  const describe = (name: string, fn: () => void) => {
    suiteStack.push(name);
    try {
      fn();
    } finally {
      suiteStack.pop();
    }
  };

  const it = (name: string, fn: () => void) => {
    const suite = suiteStack.join(' › ');
    try {
      fn();
      results.push({ suite, name, passed: true });
    } catch (error) {
      results.push({
        suite,
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const expect = (actual: unknown) => ({
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) {
        throw new Error(
          `expected ${describeValue(expected)}, received ${describeValue(actual)}`
        );
      }
    },
    toEqual(expected: unknown) {
      if (!deepEqual(actual, expected)) {
        throw new Error(
          `expected ${describeValue(expected)}, received ${describeValue(actual)}`
        );
      }
    },
  });

  harness(impl, describe, it, expect);

  return {
    results,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    engine: detectEngine(),
  };
}
