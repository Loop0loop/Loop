#!/usr/bin/env node
// Safe postinstall helper: runs electron-rebuild against installed electron version
// This does NOT remove node_modules or re-run `pnpm install` to avoid recursion.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function log(...args) {
  console.log('[postinstall-rebuild]', ...args);
}

try {
  const electronPkgPath = path.join(process.cwd(), 'node_modules', 'electron', 'package.json');
  if (!fs.existsSync(electronPkgPath)) {
    log('electron not found in node_modules — skipping native rebuild');
    process.exit(0);
  }

  const electronVersion = require(electronPkgPath).version;
  if (!electronVersion) {
    log('could not detect electron version — skipping native rebuild');
    process.exit(0);
  }

  log('Detected electron version', electronVersion);

  const bin = path.join(process.cwd(), 'node_modules', '.bin', 'electron-rebuild');
  if (!fs.existsSync(bin)) {
    log('electron-rebuild binary not found in node_modules. Installing @electron/rebuild as devDependency will expose it. Skipping.');
    process.exit(0);
  }

  log('Running electron-rebuild -f -v', electronVersion);
  execSync(`${bin} -f -v ${electronVersion}`, { stdio: 'inherit' });
  log('electron-rebuild finished');
} catch (err) {
  // postinstall should not fail overall install — just warn
  console.error('[postinstall-rebuild] warning: failed to run electron-rebuild', err);
  process.exit(0);
}
