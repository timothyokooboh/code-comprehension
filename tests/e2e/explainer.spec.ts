import { test, expect } from '@playwright/test';
import { launchCli } from '../support/cli.js';

test('silent explainer supports playback, chapters and a readable companion', async ({
  page,
}) => {
  const app = await launchCli(['--explainer', 'tests/fixtures/explainer.json']);
  try {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${app.url}/explainer`);
    await expect(
      page.getByRole('heading', { name: 'How the system works' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Reasoning stays with the agent',
        exact: true,
      })
      .click();
    await expect(page.getByLabel('Playback position')).toHaveValue('6');
    await page.screenshot({ path: '/tmp/code-comprehension-explainer.png' });
    const bounds = await page.getByLabel('Playback position').boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(768);
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(
      page.getByText('Read the walkthrough', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('0123456789012345678901234567890123456789', {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await app.stop();
  }
});

test('explainer request failures recover and the text equivalent works on mobile with reduced motion', async ({
  page,
}) => {
  const app = await launchCli(['--explainer', 'tests/fixtures/explainer.json']);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/explainer', (route) =>
      route.fulfill({ status: 503 }),
    );
    await page.goto(`${app.url}/explainer`);
    await expect(page.getByRole('alert')).toContainText(
      'Unable to load this walkthrough',
    );
    await page.unroute('**/api/explainer');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole('heading', { name: 'Scene-by-scene explanation' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'The runtime validates the contract and serves the browser.',
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  } finally {
    await app.stop();
  }
});

test('renderer load failure leaves the readable walkthrough available and can be retried', async ({
  page,
}) => {
  const app = await launchCli(['--explainer', 'tests/fixtures/explainer.json']);
  try {
    await page.route('**/assets/player-*.js', (route) => route.abort());
    await page.goto(`${app.url}/explainer`);
    await expect(page.getByRole('alert')).toContainText(
      'The animation could not be displayed',
    );
    await expect(
      page.getByRole('heading', { name: 'Read the walkthrough' }),
    ).toBeVisible();
    await page.unroute('**/assets/player-*.js');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
  } finally {
    await app.stop();
  }
});
