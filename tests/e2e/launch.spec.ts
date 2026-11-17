import { expect, test } from '@playwright/test';
import { launchCli } from '../support/cli.js';

test('the built application renders and connects to its local server', async ({ page }) => {
  const app = await launchCli();
  try {
    await page.goto(app.url);
    await expect(page.getByRole('heading', { name: 'Code Comprehension', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Connected locally');
    await expect(page.getByRole('heading', { name: 'No assessment loaded' })).toBeVisible();
  } finally {
    await app.stop();
  }
});
