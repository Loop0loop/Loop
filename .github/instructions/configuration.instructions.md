---
applyTo: "*.config.ts,*.config.js,tsconfig*.json,electron-builder.json,.env*"
description: Instructions for Loop's configuration files
---

# Configuration Files Guidelines

You are working on Loop's configuration files. These files control build processes, TypeScript compilation, linting, and environment settings.

## Environment Variables

Loop uses `.env` files for configuration. Never commit sensitive values.

**Environment file hierarchy**:
1. `.env.local` (local overrides, gitignored)
2. `.env.development` (development defaults)
3. `.env.production` (production defaults)
4. `.env` (shared defaults)

**Main process environment variables**:
```bash
# Required
DATABASE_URL=file:./loop.db
NODE_ENV=development

# Optional AI Services
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Build
APPLE_ID=...
APPLE_ID_PASSWORD=...
APPLE_TEAM_ID=...
```

**Renderer process**: Never expose sensitive keys directly. Use IPC to access services.

**Loading environment variables**:
```typescript
import { config } from 'dotenv';

// Load in order of precedence
config({ path: '.env' });
config({ path: '.env.local', override: true });
```

## TypeScript Configuration

Loop uses a hierarchical TypeScript configuration:

**`tsconfig.base.json`**: Shared compiler options
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**`tsconfig.json`**: Root configuration (renderer + shared)
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/renderer/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

**`tsconfig.main.json`**: Main process configuration
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "paths": {
      "@main/*": ["./src/main/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"]
}
```

**When modifying TypeScript config**:
- Preserve strict mode settings
- Keep path aliases consistent
- Don't add `"noEmit": false` (Vite handles compilation)
- Maintain separate configs for different contexts

## Electron Vite Configuration

`electron.vite.config.ts` configures the build process:

**Key sections**:
```typescript
export default defineConfig(({ mode }) => ({
  main: {
    // Main process config
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        external: ['electron', '@prisma/client', 'better-sqlite3']
      }
    }
  },
  preload: {
    // Preload script config
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    // Renderer process config
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: 'src/renderer/index.html'
      }
    }
  }
}));
```

**Environment variable handling**:
```typescript
// Only expose safe variables to renderer
define: {
  'process.env.NODE_ENV': JSON.stringify(mode),
  'process.env.DEBUG': JSON.stringify(process.env.DEBUG || 'false'),
  // NEVER expose API keys or secrets
}
```

## Electron Builder Configuration

`electron-builder.json` controls packaging:

**Critical settings**:
```json
{
  "appId": "com.loop.app",
  "productName": "Loop",
  "asar": true,
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "files": [
    "out/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "win": {
    "target": "nsis",
    "arch": ["x64", "arm64"]
  }
}
```

**When modifying**:
- Always include required native modules in `files`
- Set proper code signing for macOS
- Configure auto-updater URL
- Test builds on target platforms

## Vite Configuration Patterns

**Alias configuration**:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src/renderer'),
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@main': path.resolve(__dirname, 'src/main')
  }
}
```

**Plugin configuration**:
```typescript
plugins: [
  react(),
  // Custom plugin for Loop-specific processing
]
```

## ESLint Configuration

`.eslintrc.js` enforces code quality:

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react/react-in-jsx-scope': 'off', // React 19
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
};
```

**When adding rules**:
- Maintain strict TypeScript rules
- Allow warnings but minimize errors
- Consider team consensus for new rules

## Tailwind Configuration

`tailwind.config.js` for styling:

```javascript
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Loop-specific colors
      }
    }
  },
  plugins: []
};
```

## Vitest Configuration

`vitest.config.ts` for testing:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.spec.ts']
    }
  }
});
```

## Best Practices

1. **Never commit secrets** - Use `.env.local` for sensitive data
2. **Document environment variables** - Update ENVIRONMENT_VARIABLES.md
3. **Test configuration changes** - Ensure builds work after changes
4. **Validate before commit** - Run `pnpm build` to verify config
5. **Keep configs DRY** - Use `extends` for shared settings
6. **Version lock critical settings** - Avoid breaking changes in config