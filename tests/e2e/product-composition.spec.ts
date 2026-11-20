import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

for (const scopeCount of [2, 9]) {
  test(`covers all ${scopeCount} scopes on initial draw, retake, reload and completion`, async ({ page }) => {
    const repo = createRepository();
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    const ids = Array.from({ length: scopeCount }, (_, index) => `scope${index}`);
    try {
      expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
      for (const id of ids) {
        const questions = Array.from({ length: id === ids[0] ? 12 : 1 }, (_, index) => ({
          ...fixture.questions[0], id: `q${index}`, prompt: `${id} scenario ${index}`,
          references: [{ path: 'payment.ts' }],
        }));
        repo.write('bank.json', JSON.stringify({ version: 1, id,
          scope: { kind: 'module', name: id, description: id, sourcePatterns: ['payment.ts'], supportingFiles: [] },
          quiz: { ...fixture, type: 'product', questions },
        }));
        expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
      }
      // Keep shuffle deterministic: an ungrouped first-eight draw omits later scopes.
      await page.addInitScript(() => { Math.random = () => 0.999; });
      const app = await launchCli(['--product-bank', ...ids, '--repo', repo.path]);
      try {
        await page.goto(app.url);
        const count = scopeCount === 2 ? 8 : 9;
        let previous: string[] = [];
        for (let attempt = 0; attempt < 2; attempt++) {
          await expect(page.locator('fieldset')).toHaveCount(count);
          const prompts = await page.locator('legend').allTextContents();
          for (const id of ids) expect(prompts.some((prompt) => prompt.includes(`${id} scenario`))).toBe(true);
          if (attempt) expect(prompts).not.toEqual(previous);
          previous = prompts;
          for (const fieldset of await page.locator('fieldset').all()) await fieldset.getByRole('radio').first().check();
          await page.reload();
          await expect(page.locator('input:checked')).toHaveCount(count);
          expect(await page.locator('legend').allTextContents()).toEqual(prompts);
          await page.getByRole('button', { name: 'Submit answers' }).click();
          await expect(page.getByRole('heading', { name: `Score: ${count} of ${count} (100%)` })).toBeVisible();
          if (!attempt) await page.getByRole('button', { name: 'Retake quiz' }).click();
        }
      } finally { await app.stop(); }
    } finally { repo.dispose(); }
  });
}
