// Metro config for an npm-workspace monorepo.
//
// Without this, Metro will not follow the `@pill-parse/core` symlink out of
// apps/mobile — it only watches the project directory by default, so the shared
// domain package resolves in Jest (Node resolution) but fails at bundle time.
// See https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits to packages/core trigger a reload.
config.watchFolders = [workspaceRoot];

// Resolve from the app first, then the hoisted workspace root. Expo and React
// Native are nested under apps/mobile (npm kept them there because the web app
// pins React 18 while this app is on 19), so app-local must come first.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Hierarchical lookup stays ON (the default) deliberately.
//
// Expo's monorepo guide suggests `disableHierarchicalLookup = true`, which suits
// a flat pnpm-style store. npm resolves this workspace differently: because the
// web app pins React 18 and this app is on 19, npm nests Expo's own dependencies
// at apps/mobile/node_modules/expo/node_modules/*. Disabling hierarchical lookup
// makes those nested packages unreachable and the bundle fails on `expo-asset`.
// Leave it enabled unless the install layout changes.

module.exports = config;
