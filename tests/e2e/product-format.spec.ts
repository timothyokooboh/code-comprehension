import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

test('a product sitting keeps its requested mixed composition after reload and publishes matching question numbers', async ({ page }) => {
  const repo = createRepository();
  try {
    runCli(['--configure-product', 'local', '--repo', repo.path]);
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/mixed-quiz.json', import.meta.url), 'utf8'));
    const questions = Array.from({ length: 8 }, (_, index) => ({
      ...fixture.questions[index % 2 ? 2 : 0], id: 'q' + index, prompt: 'Question ' + index, references: [{ path: 'payment.ts' }],
    }));
    repo.write('bank.json', JSON.stringify({ version: 1, id: 'overview',
      scope: { kind: 'general', name: 'Overview', description: 'Overview', sourcePatterns: ['payment.ts'], supportingFiles: [] },
      quiz: { ...fixture, type: 'product', questions } }));
    expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    const app = await launchCli(['--product-bank', 'overview', '--format', 'mixed', '--questions', '4', '--written-questions', '1', '--repo', repo.path]);
    try {
      await page.goto(app.url);
      await expect(page.getByRole('textbox')).toHaveCount(1);
      await expect(page.locator('fieldset')).toHaveCount(3);
      await page.getByRole('textbox').fill('A draft explanation.');
      await page.reload();
      await expect(page.getByRole('textbox')).toHaveCount(1);
      await expect(page.getByRole('textbox')).toHaveValue('A draft explanation.');
      await expect(page.locator('fieldset')).toHaveCount(3);
      await expect.poll(async () => (await (await fetch(app.url + '/api/assessment')).json()).displayed.length).toBe(4);
    } finally { await app.stop(); }
  } finally { repo.dispose(); }
});
