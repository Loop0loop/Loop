import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: [
            'src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@main': path.resolve(__dirname, './src/main'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@preload': path.resolve(__dirname, './src/preload')
        },
        setupFiles: ['./test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '.next/',
                'coverage/',
                'out/',
                'src/renderer/app/',
                'src/renderer/.next/',
                'src/renderer/out/',
                '**/*.d.ts',
                'test/setup.ts',
            ],
        },
    },
});
