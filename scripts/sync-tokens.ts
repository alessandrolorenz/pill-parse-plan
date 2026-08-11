/**
 * sync-tokens.ts
 * Fetches design token variables from the Figma REST API and updates src/index.css
 * with the corresponding CSS custom properties.
 *
 * Usage:
 *   FIGMA_TOKEN=<pat> npx tsx --tsconfig tsconfig.scripts.json scripts/sync-tokens.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FIGMA_FILE_KEY, FIGMA_TOKEN, FIGMA_API_BASE, TOKEN_CSS_MAP, LIGHT_MODE_NAME } from './figma-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_FILE = path.resolve(__dirname, '../src/index.css');

// ─── Types ────────────────────────────────────────────────────────────────────

interface FigmaColor { r: number; g: number; b: number; a: number }
interface FigmaVariableValue { type: string; value: FigmaColor | number | string | boolean }

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, FigmaColor | number | string | boolean>;
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variableIds: string[];
}

interface FigmaVariablesResponse {
  status: number;
  error: boolean;
  meta: {
    variables: Record<string, FigmaVariable>;
    variableCollections: Record<string, FigmaVariableCollection>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100),
    Math.round(l * 100),
  ];
}

function colorToHsl(color: FigmaColor): string {
  const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
  return `${h} ${s}% ${l}%`;
}

async function fetchFigmaVariables(): Promise<FigmaVariablesResponse> {
  const url = `${FIGMA_API_BASE}/files/${FIGMA_FILE_KEY}/variables/local`;
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });
  if (!res.ok) {
    throw new Error(`Figma API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<FigmaVariablesResponse>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!FIGMA_TOKEN) {
    console.error('❌  FIGMA_TOKEN environment variable is not set.');
    console.error('    Export it before running: export FIGMA_TOKEN=<your_pat>');
    process.exit(1);
  }

  console.log('🔍  Fetching Figma variables…');
  const data = await fetchFigmaVariables();

  const { variables, variableCollections } = data.meta;

  // Find the light mode ID across all collections
  let lightModeId: string | undefined;
  for (const col of Object.values(variableCollections)) {
    const mode = col.modes.find(m => m.name === LIGHT_MODE_NAME);
    if (mode) { lightModeId = mode.modeId; break; }
  }

  if (!lightModeId) {
    // Fall back to first mode of first collection
    const firstCol = Object.values(variableCollections)[0];
    lightModeId = firstCol?.modes[0]?.modeId;
    console.warn(`⚠️  Mode "${LIGHT_MODE_NAME}" not found — using first available mode.`);
  }

  // Build CSS variable declarations
  const cssLines: string[] = [];
  let updatedCount = 0;

  for (const variable of Object.values(variables)) {
    const cssName = TOKEN_CSS_MAP[variable.name];
    if (!cssName) continue; // not mapped

    const rawValue = variable.valuesByMode[lightModeId!];
    if (rawValue === undefined) continue;

    let cssValue: string;

    if (variable.resolvedType === 'COLOR') {
      const color = rawValue as FigmaColor;
      cssValue = colorToHsl(color);
    } else if (variable.resolvedType === 'FLOAT') {
      const num = rawValue as number;
      // Spacing and radius are stored in px
      cssValue = `${num}px`;
    } else {
      cssValue = String(rawValue);
    }

    cssLines.push(`  ${cssName}: ${cssValue};`);
    updatedCount++;
  }

  if (cssLines.length === 0) {
    console.warn('⚠️  No matching variables found. Check TOKEN_CSS_MAP in figma-config.ts.');
    return;
  }

  // Read existing CSS file
  const cssContent = fs.readFileSync(CSS_FILE, 'utf-8');

  // Replace the :root block's token declarations
  // Strategy: replace lines between /* FIGMA-TOKENS-START */ and /* FIGMA-TOKENS-END */ markers
  const startMarker = '  /* FIGMA-TOKENS-START */';
  const endMarker = '  /* FIGMA-TOKENS-END */';

  const startIdx = cssContent.indexOf(startMarker);
  const endIdx = cssContent.indexOf(endMarker);

  let newCssContent: string;

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace between markers
    const before = cssContent.slice(0, startIdx + startMarker.length);
    const after = cssContent.slice(endIdx);
    newCssContent = `${before}\n${cssLines.join('\n')}\n  ${after}`;
  } else {
    // Inject markers + tokens into :root block
    const rootMatch = cssContent.match(/:root\s*\{/);
    if (!rootMatch || rootMatch.index === undefined) {
      throw new Error('Could not find :root block in src/index.css');
    }
    const insertAt = rootMatch.index + rootMatch[0].length;
    const injection = `\n${startMarker}\n${cssLines.join('\n')}\n  ${endMarker}`;
    newCssContent = cssContent.slice(0, insertAt) + injection + cssContent.slice(insertAt);
  }

  fs.writeFileSync(CSS_FILE, newCssContent, 'utf-8');
  console.log(`✅  Updated ${updatedCount} token(s) in src/index.css`);
}

main().catch(err => {
  console.error('❌  sync-tokens failed:', err);
  process.exit(1);
});