import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

for (const requested of [2, 10]) {
  test(`respects requested count ${requested} across modules, retakes, reloads and agent mapping`, async ({ page }) => {
    const repo = createRepository();
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    const ids = ['cart', 'payments', 'reporting'];
    try {
      expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
      for (const id of ids) {
        repo.write('bank.json', JSON.stringify({ version: 1, id,
          scope: { kind: 'module', name: id, description: id, sourcePatterns: ['payment.ts'], supportingFiles: [] },
          quiz: { ...fixture, type: 'product', questions: [{ ...fixture.questions[0], prompt: `${id}: retry behaviour`, references: [{ path: 'payment.ts' }] }] },
        }));
        expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
      }
      const app = await launchCli(['--product-bank', ...ids, '--questions', String(requested), '--repo', repo.path]);
      try {
        await page.goto(app.url);
        const count = requested === 2 ? 2 : 3;
        await expect(page.locator('fieldset')).toHaveCount(count);
        const initial = await page.locator('legend').allTextContents();
        for (const group of await page.locator('fieldset').all()) await group.getByRole('radio').first().check();
        await page.reload();
        await expect(page.locator('input:checked')).toHaveCount(count);
        expect(await page.locator('legend').allTextContents()).toEqual(initial);
        await page.getByRole('button', { name: 'Submit answers' }).click();
        await expect(page.getByRole('heading', { name: `Score: ${count} of ${count} (100%)` })).toBeVisible();
        await page.getByRole('button', { name: 'Retake quiz' }).click();
        await expect(page.locator('fieldset')).toHaveCount(count);
        const next = await page.locator('legend').allTextContents();
        if (requested === 2) {
          const prompts = initial.map((text) => text.replace(/^\d+\. /, ''));
          expect(next.some((text) => !prompts.includes(text.replace(/^\d+\. /, '')))).toBe(true);
        }
        await expect.poll(async () => (await (await fetch(`${app.url}/api/assessment`)).json()).displayed.length).toBe(count);
      } finally { await app.stop(); }
    } finally { repo.dispose(); }
  });
}
