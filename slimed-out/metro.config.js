// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand's ESM build references `import.meta`, which throws at runtime when
// Metro bundles it as a classic script for web ("Cannot use 'import.meta'
// outside a module"). The page still renders, so this shows up as an app that
// is silently non-interactive rather than as a build error.
//
// Native is unaffected - zustand's "react-native" export condition already
// points at the CommonJS build - so we only redirect web, and only zustand,
// leaving package exports enabled for every other dependency.
const ZUSTAND_ROOT = path.join(__dirname, 'node_modules', 'zustand');

function zustandCjsPath(moduleName) {
  const subpath = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
  const filePath = path.join(ZUSTAND_ROOT, `${subpath}.js`);
  return filePath.startsWith(ZUSTAND_ROOT) && fs.existsSync(filePath) ? filePath : null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const filePath = zustandCjsPath(moduleName);
    if (filePath) return { type: 'sourceFile', filePath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
