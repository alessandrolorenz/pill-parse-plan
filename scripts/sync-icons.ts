/**
 * sync-icons.ts
 * Exports icon components from the Figma file as SVG files into src/assets/icons/.
 * Only exports components whose name starts with "Icon/" or "icon/".
 *
 * Usage:
 *   FIGMA_TOKEN=<pat> npx tsx --tsconfig tsconfig.scripts.json scripts/sync-icons.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FIGMA_FILE_KEY, FIGMA_TOKEN, FIGMA_API_BASE } from './figma-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '../src/assets/icons');
const INDEX_FILE = path.resolve(__dirname, '../src/assets/icons/index.ts');

// ─── Types ────────────────────────────────────────────────────────────────────

interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  node_id: string;
}

interface FigmaComponentsResponse {
  meta: { components: FigmaComponent[] };
}

interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string>; // nodeId → URL
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert "Icon/ChevronRight" → "chevron-right" (kebab-case filename) */
function toKebabCase(name: string): string {
  return name
    .replace(/^[Ii]con\//i, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '');
}

/** Convert "Icon/ChevronRight" → "IconChevronRight" (PascalCase React component name) */
function toPascalCase(name: string): string {
  return name
    .replace(/^[Ii]con\//i, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase());
}

async function fetchComponents(): Promise<FigmaComponent[]> {
  const url = `${FIGMA_API_BASE}/files/${FIGMA_FILE_KEY}/components`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN } });
  if (!res.ok) throw new Error(`Figma API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as FigmaComponentsResponse;
  return data.meta.components;
}

async function fetchSvgUrls(nodeIds: string[]): Promise<Record<string, string>> {
  // Figma limits to ~100 nodes per request
  const BATCH = 100;
  const result: Record<string, string> = {};

  for (let i = 0; i < nodeIds.length; i += BATCH) {
    const batch = nodeIds.slice(i, i + BATCH);
    const ids = batch.join(',');
    const url = `${FIGMA_API_BASE}/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg&svg_include_id=false&svg_simplify_stroke=true`;
    const res = await fetch(url, { headers: { 'X-Figma-Token': FIGMA_TOKEN } });
    if (!res.ok) throw new Error(`Figma images API error ${res.status}: ${await res.text()}`);
    const data = await res.json() as FigmaImagesResponse;
    if (data.err) throw new Error(`Figma images error: ${data.err}`);
    Object.assign(result, data.images);
  }

  return result;
}

async function downloadSvg(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download SVG from ${url}: ${res.status}`);
  return res.text();
}

/** Clean up Figma SVG output: remove width/height, add currentColor */
function cleanSvg(svg: string, name: string): string {
  return svg
    // Remove fixed width/height (we use CSS sizing)
    .replace(/\s+width="[^"]*"/g, '')
    .replace(/\s+height="[^"]*"/g, '')
    // Add viewBox if missing (Figma usually includes it)
    // Replace hardcoded fill/stroke colors with currentColor for theming
    .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"')
    .replace(/stroke="#[0-9a-fA-F]{3,8}"/g, 'stroke="currentColor"')
    // Add aria-hidden and role for accessibility
    .replace('<svg ', `<svg aria-hidden="true" focusable="false" `)
    // Add data attribute for traceability
    .replace('<svg ', `<svg data-icon="${name}" `);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!FIGMA_TOKEN) {
    console.error('❌  FIGMA_TOKEN environment variable is not set.');
    process.exit(1);
  }

  console.log('🔍  Fetching Figma components…');
  const allComponents = await fetchComponents();

  // Filter to icon components only
  const iconComponents = allComponents.filter(c =>
    /^[Ii]con\//i.test(c.name)
  );

  if (iconComponents.length === 0) {
    console.warn('⚠️  No icon components found (expected names starting with "Icon/").');
    console.warn('   Skipping icon sync.');
    return;
  }

  console.log(`   Found ${iconComponents.length} icon component(s).`);

  // Ensure output directory exists
  if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

  // Fetch SVG export URLs
  console.log('📥  Requesting SVG exports from Figma…');
  const nodeIds = iconComponents.map(c => c.node_id);
  const svgUrls = await fetchSvgUrls(nodeIds);

  // Download and save each SVG
  const exportedNames: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const component of iconComponents) {
    const svgUrl = svgUrls[component.node_id];
    if (!svgUrl) {
      console.warn(`   ⚠️  No SVG URL for "${component.name}" (${component.node_id})`);
      errorCount++;
      continue;
    }

    try {
      const rawSvg = await downloadSvg(svgUrl);
      const kebab = toKebabCase(component.name);
      const cleanedSvg = cleanSvg(rawSvg, kebab);
      const outPath = path.join(ICONS_DIR, `${kebab}.svg`);
      fs.writeFileSync(outPath, cleanedSvg, 'utf-8');
      exportedNames.push(component.name);
      successCount++;
      process.stdout.write(`   ✓ ${kebab}.svg\n`);
    } catch (err) {
      console.warn(`   ⚠️  Failed to export "${component.name}":`, err);
      errorCount++;
    }
  }

  // Generate barrel index file
  generateIndex(iconComponents.filter(c => exportedNames.includes(c.name)));

  console.log(`\n✅  Exported ${successCount} icon(s) → src/assets/icons/`);
  if (errorCount > 0) console.warn(`⚠️  ${errorCount} icon(s) failed to export.`);
}

function generateIndex(components: FigmaComponent[]) {
  const lines: string[] = [
    '/**',
    ' * icons/index.ts — AUTO-GENERATED by scripts/sync-icons.ts',
    ' * DO NOT EDIT MANUALLY. Run `npm run script:sync-icons` to regenerate.',
    ' */',
    '',
    '/** All available icon names */  ',
    'export const ICON_NAMES = [',
  ];

  const kebabNames = components.map(c => toKebabCase(c.name));
  for (const name of kebabNames) {
    lines.push(`  '${name}',`);
  }

  lines.push('] as const;');
  lines.push('');
  lines.push('export type IconName = typeof ICON_NAMES[number];');
  lines.push('');
  lines.push('/** Returns the URL for an SVG icon (for use with <img> or CSS background-image) */');
  lines.push('export function getIconUrl(name: IconName): string {');
  lines.push("  return `/src/assets/icons/${name}.svg`;");
  lines.push('}');
  lines.push('');

  fs.writeFileSync(INDEX_FILE, lines.join('\n'), 'utf-8');
  console.log('   ✓ src/assets/icons/index.ts');
}

main().catch(err => {
  console.error('❌  sync-icons failed:', err);
  process.exit(1);
});