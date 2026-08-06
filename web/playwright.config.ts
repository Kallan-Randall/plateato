import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// `next dev` (started below as the webServer) loads .env.local itself, but
// the Playwright test *process* needs its own copy of the Supabase URL/key
// too - the cleanup step in e2e/recipes.spec.ts talks to Supabase directly,
// outside the app. .env.test layers the suite's dedicated test-account
// credentials on top.
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.test') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Signs in once via the real UI and saves the resulting session, so
    // every other test starts already authenticated instead of re-doing the
    // login flow itself.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
