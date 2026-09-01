/**
 * Purity gate for @pill-parse/core — AC-T04 of _specs/core/types.spec.md.
 *
 * `packages/core` is shared verbatim between the web app and Hermes. That only
 * holds while it depends on nothing: no npm packages, no platform globals, and
 * no `Intl`. A single stray import here silently costs behavioral parity, and
 * the failure would surface on a device rather than in a Node test run — which
 * is precisely why this is a static scan rather than a runtime assertion.
 *
 * Scanned: every shipped file under packages/core/src, INCLUDING testing/,
 * because the harness runs on Hermes too. Excluded: this directory
 * (__tests__/), whose files are Vitest drivers that legitimately use Node APIs
 * and never ship.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, '..', '..');
const SRC = join(PACKAGE_ROOT, 'src');

/** Test drivers may use Node APIs; nothing else in the package may. */
const EXCLUDED_DIRS = new Set(['__tests__']);

function shippedFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) shippedFiles(full, found);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      found.push(full);
    }
  }
  return found;
}

const FILES = shippedFiles(SRC).map((path) => ({
  path: relative(PACKAGE_ROOT, path).replace(/\\/g, '/'),
  source: readFileSync(path, 'utf8'),
}));

/** Strips comments so prose about a banned API is not mistaken for a use of it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Also strips string literals, for the checks that look for bare identifiers.
 *
 * Needed because assertion names are prose: the harness contains
 * "an interval that does not divide the window evenly", and a naive scan reads
 * that as a reference to `window`. The first run of this suite failed on
 * exactly that, which is a fair demonstration of why the checks below strip
 * before matching rather than grepping raw source.
 *
 * Template literals keep their `${...}` interpolations, so a real
 * `${window.x}` still gets caught.
 */
function stripCommentsAndLiterals(source: string): string {
  return stripComments(source)
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, (literal) => {
      const interpolations = literal.match(/\$\{[^}]*\}/g) ?? [];
      return `\`${interpolations.join('')}\``;
    })
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/**
 * Platform globals that would compile fine and break on one runtime or the
 * other. `process` is Node, the rest are browser; React Native has none of them.
 */
const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'process',
  'globalThis',
  'require',
];

describe('AC-T04: @pill-parse/core carries no platform dependencies', () => {
  it('scans a non-empty set of shipped files', () => {
    // Guards the whole suite: a broken glob would make every check below
    // vacuously pass.
    expect(FILES.length > 0).toBe(true);
  });

  it('declares no runtime dependencies', () => {
    const pkg = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> };

    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  it('imports nothing outside the package', () => {
    const offenders: string[] = [];

    for (const { path, source } of FILES) {
      const clean = stripComments(source);
      const specifiers = [
        ...clean.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g),
        ...clean.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
      ].map((match) => match[1]);

      for (const specifier of specifiers) {
        if (!specifier.startsWith('.')) {
          offenders.push(`${path} imports "${specifier}"`);
        }
      }
    }

    expect(offenders.join(' | ')).toBe('');
  });

  it('references no browser, Node, or React Native global', () => {
    const offenders: string[] = [];

    for (const { path, source } of FILES) {
      const clean = stripCommentsAndLiterals(source);
      for (const name of FORBIDDEN_GLOBALS) {
        // Word-boundary match, but not when it is a property access
        // (`event.document`) or an object key.
        if (new RegExp(`(?<![.\\w$])${name}\\b`).test(clean)) {
          offenders.push(`${path} references "${name}"`);
        }
      }
    }

    expect(offenders.join(' | ')).toBe('');
  });

  it('uses no Intl or toLocale* API', () => {
    // The subtlest of the bans and the reason this test exists at all: Hermes
    // delegates Intl to platform ICU on Android, so output varies by device.
    // `formatEventForDisplay` was deleted for this; see _specs/architecture.md.
    const offenders: string[] = [];

    for (const { path, source } of FILES) {
      const clean = stripCommentsAndLiterals(source);
      if (/\bIntl\b/.test(clean)) offenders.push(`${path} references "Intl"`);
      const locale = clean.match(/\.toLocale\w*/);
      if (locale) offenders.push(`${path} calls "${locale[0]}"`);
    }

    expect(offenders.join(' | ')).toBe('');
  });
});
