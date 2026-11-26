import { test, expect } from '@playwright/test';
import { launchCli } from '../support/cli.js';

test('silent explainer supports playback, chapters and a readable companion', async ({
  page,
}, testInfo) => {
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
    await page.getByLabel('Chapters', { exact: true }).selectOption('review');
    await expect(page.getByLabel('Playback position')).toHaveValue('6');
    await page.screenshot({ path: testInfo.outputPath('explainer.png') });
    const bounds = await page.getByLabel('Playback position').boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(768);
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
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
    const transcript = page.getByRole('heading', { name: 'Scene-by-scene explanation' });
    await expect(transcript).toBeAttached();
    const bounds = await transcript.locator('..').boundingBox();
    expect(bounds!.width).toBe(1);
    expect(bounds!.height).toBe(1);
    await expect(page.getByRole('heading', { name: 'Read the walkthrough' })).toBeVisible();
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

test('maximum chapter navigation fits the laptop and generated markup stays text', async ({
  page,
}) => {
  const app = await launchCli(['--explainer', 'tests/fixtures/explainer.json']);
  try {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.route('**/api/explainer', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.title = '<img src=x onerror=alert(1)>';
      data.scenes = Array.from({ length: 24 }, (_, index) => ({
        ...data.scenes[0],
        id: `chapter-${index}`,
        title: `${index + 1}. ${'Long chapter title '.repeat(4)}`,
        beats: [{ ...data.scenes[0].beats[0], durationSeconds: 2 }],
      }));
      await route.fulfill({ json: data });
    });
    await page.goto(`${app.url}/explainer`);
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole('heading', { name: '<img src=x onerror=alert(1)>' }),
    ).toBeVisible();
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    const chapters = page.getByLabel('Chapters', { exact: true });
    const bounds = await chapters.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(768);
    await chapters.selectOption('chapter-23');
    await expect(page.getByLabel('Playback position')).toHaveValue('46');
    await page.getByLabel('Playback position').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByLabel('Playback position')).toHaveValue('45.9');
  } finally {
    await app.stop();
  }
});
