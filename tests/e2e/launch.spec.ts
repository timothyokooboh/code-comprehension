import { expect, test } from '@playwright/test';
import { launchCli } from '../support/cli.js';

test('the built application renders and connects to its local server', async ({ page }) => {
  const app = await launchCli();
  try {
    await page.goto(app.url);
    await expect(page).toHaveTitle('Code Comprehension');
    await expect(page.getByRole('heading', { name: 'Code Comprehension', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Connected locally');
    await expect(page.getByRole('heading', { name: 'No assessment loaded' })).toBeVisible();
  } finally {
    await app.stop();
  }
});

test('an unavailable runtime shows recovery guidance', async ({ page }) => {
  const app = await launchCli();
  try {
    await page.route('**/api/status', (route) => route.fulfill({ status: 503 }));
    await page.goto(app.url);
    await expect(page.getByRole('alert')).toHaveText(
      'Unable to connect. Restart the CLI and reload this page.',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
  } finally {
    await app.stop();
  }
});

test('a malformed runtime response shows recovery guidance instead of a connection', async ({ page }) => {
  const app = await launchCli();
  try {
    await page.route('**/api/status', (route) => route.fulfill({ json: { status: 'ready' } }));
    await page.goto(app.url);
    await expect(page.getByRole('alert')).toHaveText(
      'The local server returned an invalid response. Restart the CLI and reload this page.',
    );
  } finally {
    await app.stop();
  }
});
