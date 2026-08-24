#!/usr/bin/env node
/**
 * Pre-submission safeguard.
 *
 * Exports a PRODUCTION bundle and fails if any developer-testing-mode marker
 * survives into it. A "free everything" backdoor in a shipped build is both an
 * App Store rejection risk and a straightforward exploit, so this asserts the
 * build-time gate in src/dev/devMode.ts actually did its job rather than
 * trusting that it did.
 *
 * Run before every store submission:
 *   npm run check:no-dev-mode
 *
 * Exit code 0 = clean, 1 = a marker leaked (do not ship).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Strings that must never appear in a shipped bundle. Add to this list if the
// dev feature grows new identifiable strings.
const FORBIDDEN = [
  'slimetime', // the activation code
  'Developer mode', // panel heading
  'Unlock everything', // panel control
  'Stripped from release builds', // panel note
  'Add 1B goo', // panel action
  'Turn off with the switch', // panel note
  'DevPanelImpl', // panel implementation symbol
  'Support code', // the hidden field's accessibility label
];

const PLATFORMS = ['ios', 'android'];

function main() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slimed-out-devcheck-'));
  let failed = false;

  try {
    for (const platform of PLATFORMS) {
      const dist = path.join(outDir, platform);
      process.stdout.write(`\nExporting production bundle for ${platform}...\n`);

      execFileSync(
        'npx',
        ['expo', 'export', '--platform', platform, '--output-dir', dist, '--no-minify=false'],
        { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, NODE_ENV: 'production' } }
      );

      const files = collectBundles(dist);
      if (files.length === 0) {
        console.error(`  FAIL: no bundle produced for ${platform}`);
        failed = true;
        continue;
      }

      for (const file of files) {
        const contents = fs.readFileSync(file, 'utf8');
        for (const needle of FORBIDDEN) {
          if (contents.includes(needle)) {
            console.error(`  FAIL: "${needle}" found in ${path.basename(file)}`);
            failed = true;
          }
        }
      }

      if (!failed) {
        console.log(`  OK: ${files.length} bundle(s) clean for ${platform}`);
      }
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  if (failed) {
    console.error(
      '\nDeveloper testing mode leaked into a production bundle. Do NOT submit this build.\n' +
        'Check that DEV_MODE_AVAILABLE in src/dev/devMode.ts is still a build-time constant\n' +
        '(a value the minifier cannot fold will keep the dev branches alive).\n'
    );
    process.exit(1);
  }

  console.log('\nClean: no developer-mode markers in any production bundle.\n');
}

/** Every JS/Hermes bundle under a dist directory. */
function collectBundles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectBundles(full));
    else if (/\.(js|hbc)$/.test(entry.name)) out.push(full);
  }
  return out;
}

main();
