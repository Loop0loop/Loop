Rebuilding native modules (better-sqlite3) for Electron

Problem
-------
When using native modules like better-sqlite3 under Electron, the native binary (.node) must be compiled against the *same Node/Electron ABI* as the running Electron binary. If you see an error like:

  The module '.../better_sqlite3.node' was compiled against a different Node.js version using
  NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 139.

it means the installed binary was compiled for a different ABI. You need to rebuild the native addon for the target Electron version.

Quick fixes (developer)
-----------------------
1) Install dev dependency (once):

```bash
pnpm add -D electron-rebuild
```

2) Rebuild only better-sqlite3 (recommended):

```bash
pnpm rebuild:native
# or explicitly:
# npx electron-rebuild -f -w better-sqlite3 -v 38.1.2
```

3) If you're running the app in development using `electron-vite dev`, make sure you start the dev server after rebuild.

Full rebuild (if you changed node/electron versions or many native deps):

```bash
pnpm rebuild:native:all
# or:
# npx electron-rebuild -f -v 38.1.2
```

Packaging / CI (production)
---------------------------
- The repository already includes a `postinstall` hook which runs:

  ```text
  electron-builder install-app-deps
  ```

  This will try to install and rebuild app dependencies for the packager. If CI or packager still fails with a native ABI mismatch, ensure `electron-builder install-app-deps` ran *on the CI machine* (not only the local dev machine).

- For reproducible builds on CI, run these steps explicitly in the build job before packaging:

```bash
pnpm install --frozen-lockfile
npx electron-builder install-app-deps
pnpm build
```

Notes and tips
--------------
- If you keep seeing mismatches, remove node_modules and lockfile, then reinstall and run the rebuild again:

```bash
rm -rf node_modules
pnpm install
pnpm rebuild:native
```

- You can rebuild a single package for the current Node/Electron version by using the `-w PACKAGENAME` flag.

- If you need to target a different Electron version, change the `-v` parameter on the rebuild script (or install the appropriate electron-rebuild CLI before running).

If you'd like, I can add a small convenience script under `scripts/` that wraps electron-rebuild and handles node_modules cleanup safely. Would you like me to add that?