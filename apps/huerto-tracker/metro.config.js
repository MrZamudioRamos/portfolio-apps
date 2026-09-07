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
config.watchFolders = [...config.watchFolders, workspaceRoot];

// Resolve packages from both the app and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Fallback: any unresolved module goes to the workspace root.
// Fixes cases where a locally-installed package (e.g. @expo/vector-icons)
// can't find its peer deps that were hoisted to the workspace root.
const SINGLETON_PACKAGES = new Set([
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-worklets',
  'react',
  '@react-native-async-storage/async-storage',
]);

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => {
      const moduleName = String(name);
      return SINGLETON_PACKAGES.has(moduleName)
        ? path.join(localModules, moduleName)
        : path.join(workspaceRoot, 'node_modules', moduleName);
    },
  }
);

module.exports = config;
