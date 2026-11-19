import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchCli } from '../support/cli.js';

const quizFile = fileURLToPath(new URL('../fixtures/quiz.json', import.meta.url));

test('question index supports keyboard navigation and the workspace fits a phone', async ({ page }) => {
  const app = await launchCli(['--quiz', quizFile]);
  try {
    await page.goto(app.url);
    const navigation = page.getByRole('navigation', { name: 'Question index' });
    const link = navigation.getByRole('link', { name: /Go to question 2:/ });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':target')).toBeFocused();
    await expect(page.locator(':target')).toContainText('Which actions preserve retry safety?');
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('progressbar', { name: 'Your progress' })).toHaveAttribute('value', '1');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(app.url);
    await expect(navigation).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await link.click();
    await expect(page.locator(':target')).toBeInViewport();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
  } finally {
    await app.stop();
  }
});
