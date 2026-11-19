import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

for (const kind of ['module', 'general'] as const) {
  test(`takes a ${kind} product assessment from its saved project bank`, async ({ page }) => {
    const repo = createRepository();
    const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    const name = kind === 'module' ? 'Payment retries' : 'System overview';
    try {
      repo.write('generated.json', JSON.stringify({
        version: 1, id: kind,
        scope: { kind, name, description: 'Payment behaviour', sourcePatterns: ['payment.ts'], supportingFiles: [] },
        quiz: { ...quiz, type: 'product', title: name },
      }));
      expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
      expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
      const app = await launchCli(['--product-bank', kind, '--repo', repo.path]);
      try {
        await page.goto(app.url);
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
        await expect(page.getByText(`Scope: ${name}`, { exact: true })).toBeVisible();
        await expect(page.getByRole('region', { name: 'PR comparison' })).toHaveCount(0);
        await page.getByRole('radio').first().check();
        await page.getByRole('checkbox', { name: 'Reuse the idempotency key' }).check();
        await page.getByRole('checkbox', { name: 'Record the provider response' }).check();
        await page.getByRole('button', { name: 'Submit answers' }).click();
        await expect(page.getByRole('heading', { name: 'Score: 2 of 2 (100%)' })).toBeVisible();
        await page.getByRole('button', { name: 'Retake quiz' }).click();
        await expect(page.getByRole('radio').first()).not.toBeChecked();
      } finally { await app.stop(); }
      const bank = JSON.parse(readFileSync(join(repo.path, `.comprehension/cache/${kind}.json`), 'utf8'));
      expect(Object.keys(bank).sort()).toEqual(['id', 'quiz', 'scope', 'version']);
    } finally { repo.dispose(); }
  });
}
