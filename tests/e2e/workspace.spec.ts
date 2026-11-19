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

for (const mode of ['animated', 'reduced-motion', 'without-view-transitions'] as const) {
  test(`stacked form becomes a paired review layout (${mode})`, async ({ page }) => {
    const app = await launchCli(['--quiz', quizFile]);
    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (mode === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
      if (mode === 'without-view-transitions') {
        await page.addInitScript(() => { Object.defineProperty(document, 'startViewTransition', { value: undefined }); });
      }
      await page.goto(app.url);
      const radios = page.getByRole('radio');
      await expect(radios.first()).toBeVisible();
      const first = await radios.first().boundingBox();
      const second = await radios.last().boundingBox();
      expect(second!.y).toBeGreaterThan(first!.y);
      expect(second!.x).toBe(first!.x);
      const submit = page.getByRole('button', { name: 'Submit answers' });
      await expect(page.getByRole('complementary').getByRole('button', { name: 'Submit answers' })).toHaveCount(0);
      const lastOption = await page.getByRole('checkbox').last().boundingBox();
      expect((await submit.boundingBox())!.y).toBeGreaterThan(lastOption!.y);
      await radios.first().check();
      await page.getByRole('checkbox').first().check();
      await submit.click();
      const evidence = page.getByRole('region', { name: 'Explanation for question 1', exact: true });
      await expect(evidence).toBeVisible();
      const question = page.getByRole('group', { name: '1. What happens when the provider times out?' });
      await expect.poll(async () => {
        const answerBox = await question.boundingBox();
        const evidenceBox = await evidence.boundingBox();
        return evidenceBox!.x > answerBox!.x + answerBox!.width;
      }).toBe(true);
      await expect(page.getByRole('heading', { name: 'Score: 1 of 2 (50%)' })).toBeVisible();
    } finally {
      await app.stop();
    }
  });
}
