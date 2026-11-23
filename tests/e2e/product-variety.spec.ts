import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

async function answerScenarios(page: Page) {
  for (const group of await page.locator('fieldset').all()) {
    const scenario = Number((await group.locator('legend').innerText()).match(/scenario (\d+)/)![1]);
    await group.getByRole('radio').nth(scenario % 2).check();
  }
}

test('cached product retakes draw new questions while reload preserves the active subset and answers', async ({ page }) => {
  const repo = createRepository();
  try {
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    const questions = Array.from({ length: 12 }, (_, i) => ({ ...fixture.questions[0], id: `q${i}`, prompt: `Behaviour scenario ${i}`, correctOptionIds: [i % 2 === 0 ? 'retry' : 'new'], references: [{ path: 'payment.ts' }] }));
    const bank = { version: 1, id: 'overview', scope: { kind: 'general', name: 'Overview', description: 'Whole product', sourcePatterns: ['payment.ts'], supportingFiles: [] }, quiz: { ...fixture, type: 'product', questions } };
    repo.write('generated.json', JSON.stringify(bank));
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
    expect(JSON.parse(runCli(['--check-product', 'overview', '--repo', repo.path]).stdout).status).toBe('reusable');
    const app = await launchCli(['--product-bank', 'overview', '--repo', repo.path]);
    try {
      await page.goto(app.url);
      await expect(page.locator('fieldset')).toHaveCount(10);
      const initial = await page.locator('legend').allTextContents();
      await page.getByRole('radio').first().check();
      await page.reload();
      await expect(page.getByRole('radio').first()).toBeChecked();
      expect(await page.locator('legend').allTextContents()).toEqual(initial);
      await answerScenarios(page);
      await page.getByRole('button', { name: 'Submit answers' }).click();
      await expect(page.getByRole('heading', { name: 'Score: 10 of 10 (100%)' })).toBeVisible();
      await page.getByRole('button', { name: 'Show detailed explanation' }).first().click();
      await page.getByRole('button', { name: 'Retake quiz' }).click();
      const next = await page.locator('legend').allTextContents();
      const prompts = (items: string[]) => items.map((value) => value.replace(/^\d+\. /, ''));
      expect(prompts(next).some((prompt) => !prompts(initial).includes(prompt))).toBe(true);
      expect(await page.locator('input:checked').count()).toBe(0);
      await page.reload();
      await expect(page.locator('fieldset')).toHaveCount(10);
      expect(await page.locator('legend').allTextContents()).toEqual(next);
      await answerScenarios(page);
      await page.getByRole('button', { name: 'Submit answers' }).click();
      await expect(page.getByRole('heading', { name: 'Score: 10 of 10 (100%)' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Show concise explanation' })).toHaveCount(0);
    } finally { await app.stop(); }
  } finally { repo.dispose(); }
});
