import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

test('PR quiz displays its actual comparison and survives reload without a persistent bank', async ({ page }) => {
  const repo = createRepository();
  repo.write('payment.ts', 'export const retries = 3;\n');
  const prepared = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main', '--baseline', repo.baseline]);
  expect(prepared.status, prepared.stderr).toBe(0);
  const session = JSON.parse(prepared.stdout);
  const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
  quiz.type = 'pr';
  writeFileSync(session.quizPath, JSON.stringify(quiz));
  const app = await launchCli(['--pr-session', session.directory]);
  try {
    await page.goto(app.url);
    const scope = page.getByRole('region', { name: 'PR comparison' });
    await expect(scope).toContainText(repo.baseline);
    await expect(scope).toContainText('main');
    await expect(scope).toContainText('Included');
    await page.getByRole('radio').first().check();
    await page.reload();
    await expect(page.getByRole('radio').first()).toBeChecked();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  } finally {
    await app.stop();
    expect(existsSync(session.directory)).toBe(false);
    repo.dispose();
  }
});
