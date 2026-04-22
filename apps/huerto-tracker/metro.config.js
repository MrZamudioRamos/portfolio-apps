const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const localModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// @supabase/supabase-js and other modern packages ship .cjs/.mjs builds.
// Metro only resolves extensions it knows about, so add them here.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Watch all packages in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve packages from both the app and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Fallback: any unresolved module goes to the workspace root.
// Fixes cases where a locally-installed package (e.g. @expo/vector-icons)
// can't find its peer deps that were hoisted to the workspace root.
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) =>
      path.join(workspaceRoot, 'node_modules', String(name)),
  }
);

// Block app-local copies of React Native packages that register native modules.
// These must be loaded exactly once; duplicates cause "Tried to register two views" errors.
// This list covers packages that npm may install locally due to version mismatches.
const SINGLETON_PACKAGES = [
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-gesture-handler',
  'react',
  '@react-native-async-storage/async-storage',
];

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sep = `[/\\\\]`;

config.resolver.blockList = [
  ...SINGLETON_PACKAGES.map(
    (pkg) =>
      new RegExp(
        `^${escRe(localModules)}${sep}${escRe(pkg)}${sep}`
      )
  ),
];

module.exports = config;
