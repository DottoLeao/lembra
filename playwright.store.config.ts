import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'store',
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    colorScheme: 'light',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
