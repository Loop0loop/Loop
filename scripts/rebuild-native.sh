#!/usr/bin/env bash
# Convenience helper: rebuild native modules for the current Electron version.
# Usage: ./scripts/rebuild-native.sh
set -euo pipefail

PKG="better-sqlite3"

# Detect installed electron version dynamically if available
if command -v node >/dev/null 2>&1; then
	ELECTRON_VERSION=$(node -e "try{console.log(require('electron/package.json').version)}catch(e){console.log('')}")
fi
if [ -z "$ELECTRON_VERSION" ]; then
	echo "Warning: couldn't detect installed electron version; defaulting to 38.1.2"
	ELECTRON_VERSION="38.1.2"
fi

echo "Cleaning node_modules (keeping pnpm store) and reinstalling..."
# Be cautious: don't remove pnpm store; we only remove node_modules to force binary rebuild
rm -rf node_modules
pnpm install

# Use electron-rebuild (must be installed as a dev dependency)
echo "Rebuilding native module: $PKG for Electron v${ELECTRON_VERSION}..."
if [ "${1:-}" = "--all" ]; then
	./node_modules/.bin/electron-rebuild -f -v "$ELECTRON_VERSION"
else
	./node_modules/.bin/electron-rebuild -f -w "$PKG" -v "$ELECTRON_VERSION"
fi

echo "Rebuild complete. Start your app (e.g. pnpm dev) and retry the scenario that failed before."