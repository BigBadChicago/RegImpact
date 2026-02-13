import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/types/**',
        'src/app/**',
        'src/auth.config.ts', // NextAuth config, tested indirectly
        '**/*.d.ts',
        'generated/**',
      ],
      // Coverage thresholds temporarily disabled
      // Will be enabled once core functionality is implemented
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
    threads: true,
    testTimeout: 30000,
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
