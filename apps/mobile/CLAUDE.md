@AGENTS.md

## What this app is for right now

The React Native target of the migration in `_plans/rn-migration-sdd-guide.md`. It currently
contains **no product features** — `App.tsx` is a harness screen that runs the shared scheduler
contract from `@pill-parse/core/harness` on Hermes and renders pass/fail. That is deliberate: it
proves behavioral parity with the web app before any screen is ported. Phase 3+ builds real
screens around it.

Two runners live here and they prove different things:

- `npm test` (Jest via `jest-expo`) runs in **Node/V8**. It proves the harness contract and that
  `packages/core` resolves and transforms under Babel/Metro.
- The harness screen runs on **Hermes**. Only this one proves engine-level parity, which is why
  it exists at all. Its header reports the detected engine, so a green run cannot be mistaken for
  a V8 run.

`src/harnessRunner.ts` hand-rolls `describe`/`it`/`expect`. Its `toEqual` is deliberately strict —
a permissive deep-equal would produce a meaningless green. If you extend it, re-run the negative
control described in `_specs/parity-matrix.md`.

## Running the harness screen on an emulator

`npm run android` from here, or `npx expo start --android`. Two things bite on this machine:

- **Launch the emulator with software rendering.** With the default host GPU the Pixel_9 AVD boots
  fine — `adb` connects, SystemUI runs, Expo Go gets focus — but the framebuffer stays **black**,
  including in `adb exec-out screencap`. Use
  `emulator -avd Pixel_9 -gpu swiftshader_indirect -no-snapshot`.
- **Launch it detached** (PowerShell `Start-Process`), not from a shell that may be cleaned up, or
  the emulator is signalled to shut down mid-run and Metro is left holding port 8081. If Expo says
  "Port 8081 is being used by another process", kill that process — it silently skips the dev
  server otherwise.

`adb exec-out screencap -p > shot.png` is the quickest way to see what the device actually shows;
a black frame compresses to ~15 KB, real content to ~1 MB, so the file size alone tells you.

## Workspace gotchas

- **Do not enable `resolver.disableHierarchicalLookup`** in `metro.config.js`. Expo's monorepo
  guide suggests it, but npm nests Expo's dependencies under
  `apps/mobile/node_modules/expo/node_modules/*` here, and disabling the lookup makes them
  unreachable — the bundle dies on `expo-asset`.
- **`npx expo install` does not work in this repo.** It detects the stale root `bun.lockb` and
  shells out to `bun`, which is not installed. Use `npm install -D -w mobile <pkg>@<version>` from
  the repo root. `expo install` still prints the SDK-correct versions before failing, which is a
  handy way to look them up.
- The root `CLAUDE.md` covers the pipeline, the shared package, and the web app.
