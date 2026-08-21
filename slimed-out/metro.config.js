// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some dependencies (e.g. zustand) ship an ESM build that references
// `import.meta`, which breaks when Metro bundles it as a classic script.
// Falling back to legacy "main"-based resolution avoids picking those
// ESM entry points.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
