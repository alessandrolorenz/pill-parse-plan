/**
 * figma-sync.ts
 * Orchestrator — runs all Figma sync scripts in sequence.
 *
 * Usage:
 *   FIGMA_TOKEN=<pat> npx tsx --tsconfig tsconfig.scripts.json scripts/figma-sync.ts
 *
 * Individual scripts can also be run independently:
 *   npm run script:sync-tokens
 *   npm run script:sync-text-styles
 *   npm run script:sync-icons
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TSX = 'npx tsx --tsconfig tsconfig.scripts.json';

interface SyncTask {
  name: string;
  script: string;
  description: string;
}

const TASKS: SyncTask[] = [
  {
    name: 'tokens',
    script: 'scripts/sync-tokens.ts',
    description: 'Design tokens → src/index.css',
  },
  {
    name: 'text-styles',
    script: 'scripts/sync-text-styles.ts',
    description: 'Text styles → src/lib/text-styles.ts',
  },
  {
    name: 'icons',
    script: 'scripts/sync-icons.ts',
    description: 'Icon components → src/assets/icons/',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function banner(text: string) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(line);
}

function runTask(task: SyncTask): { success: boolean; durationMs: number } {
  const start = Date.now();
  try {
    execSync(`${TSX} ${task.script}`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    });
    return { success: true, durationMs: Date.now() - start };
  } catch {
    return { success: false, durationMs: Date.now() - start };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.FIGMA_TOKEN) {
    console.error('\n❌  FIGMA_TOKEN environment variable is not set.');
    console.error('    Set it before running:');
    console.error('      export FIGMA_TOKEN=<your_personal_access_token>');
    console.error('    Or create a .env file and run:');
    console.error('      source .env && npm run script:sync\n');
    process.exit(1);
  }

  // Parse CLI flags
  const args = process.argv.slice(2);
  const onlyFlag = args.find(a => a.startsWith('--only='));
  const skipFlag = args.find(a => a.startsWith('--skip='));

  let tasks = [...TASKS];

  if (onlyFlag) {
    const only = onlyFlag.replace('--only=', '').split(',');
    tasks = tasks.filter(t => only.includes(t.name));
  }

  if (skipFlag) {
    const skip = skipFlag.replace('--skip=', '').split(',');
    tasks = tasks.filter(t => !skip.includes(t.name));
  }

  if (tasks.length === 0) {
    console.error('❌  No tasks to run after applying --only/--skip filters.');
    process.exit(1);
  }

  banner(`🔄  Figma Sync — ${new Date().toLocaleString()}`);
  console.log(`   File: https://www.figma.com/design/q241m9kJPYYMRd448hCbEd/Parser`);
  console.log(`   Tasks: ${tasks.map(t => t.name).join(', ')}\n`);

  const results: Array<{ task: SyncTask; success: boolean; durationMs: number }> = [];

  for (const task of tasks) {
    banner(`▶  ${task.name}  —  ${task.description}`);
    const result = runTask(task);
    results.push({ task, ...result });
  }

  // Summary
  banner('📊  Summary');
  let allPassed = true;
  for (const { task, success, durationMs } of results) {
    const icon = success ? '✅' : '❌';
    const duration = `${(durationMs / 1000).toFixed(1)}s`;
    console.log(`  ${icon}  ${task.name.padEnd(16)} ${task.description}  (${duration})`);
    if (!success) allPassed = false;
  }
  console.log('');

  if (!allPassed) {
    console.error('❌  One or more sync tasks failed. Check the output above for details.');
    process.exit(1);
  }

  console.log('✅  All sync tasks completed successfully.\n');
}

main().catch(err => {
  console.error('❌  figma-sync failed:', err);
  process.exit(1);
});