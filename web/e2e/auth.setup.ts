import { expect, test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL / E2E_TEST_PASSWORD are not set. Copy web/.env.test.example to web/.env.test and fill in a dedicated test account.',
    );
  }

  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('At least 6 characters').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.context().storageState({ path: authFile });
});
