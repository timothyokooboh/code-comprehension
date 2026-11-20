import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));

test('agent mapping follows retakes and revision reload explicitly resets the attempt', async ({ page }) => {
  const repo = createRepository();
  repo.write('quiz.json', JSON.stringify({ ...fixture, type: 'product', selectionSize: 2 }));
  const app = await launchCli(['--quiz', join(repo.path, 'quiz.json')]);
  const active = async () => (await fetch(`${app.url}/api/assessment`)).json();
  try {
    await page.goto(app.url);
    await expect.poll(async () => (await active()).displayed.length).toBe(2);
    const before = await active();
    const prompts = await page.locator('legend').allTextContents();
    for (const entry of before.displayed) {
      expect(prompts[entry.number - 1]).toContain(before.quiz.questions.find((question: { id: string }) => question.id === entry.id).prompt);
    }
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox', { name: 'Reuse the idempotency key' }).check();
    await page.getByRole('checkbox', { name: 'Record the provider response' }).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: 'Score: 2 of 2 (100%)' })).toBeVisible();
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect.poll(async () => (await active()).displayToken).not.toBe(before.displayToken);
    const current = await active();
    await page.getByRole('radio').first().check();
    repo.write('receipt.json', JSON.stringify({ revision: current.revision, displayToken: current.displayToken, input: { quizPath: join(repo.path, 'replacement.json') } }));
    repo.write('replacement.json', '{');
    const revise = () => runCli(['--revise-assessment', join(repo.path, 'receipt.json'), '--runtime', app.url]);
    expect(revise().status).toBe(1);
    await page.reload();
    await expect(page.getByRole('radio').first()).toBeChecked();
    await page.getByRole('checkbox', { name: 'Reuse the idempotency key' }).check();
    await page.getByRole('checkbox', { name: 'Record the provider response' }).check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: 'Score: 2 of 2 (100%)' })).toBeVisible();
    repo.write('replacement.json', readFileSync(join(repo.path, 'quiz.json'), 'utf8'));
    expect(revise().status).toBe(0);
    await expect(page.getByRole('heading', { name: 'Score: 2 of 2 (100%)' })).toBeVisible();
    await page.reload();
    await expect(page.locator('fieldset')).toHaveCount(2);
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Score:/ })).toHaveCount(0);
    await expect.poll(async () => (await active()).displayed.length).toBe(2);
    expect((await active()).revision).not.toBe(current.revision);
  } finally { await app.stop(); repo.dispose(); }
});

test('restarting an unchanged product runtime preserves the current attempt at the same origin', async ({ page }) => {
  const repo = createRepository();
  repo.write('quiz.json', JSON.stringify({ ...fixture, type: 'product' }));
  let app = await launchCli(['--quiz', join(repo.path, 'quiz.json')]);
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    const port = new URL(app.url).port;
    await app.stop();
    app = await launchCli(['--quiz', join(repo.path, 'quiz.json'), '--port', port]);
    await page.reload();
    await expect(page.getByRole('radio').first()).toBeChecked();
  } finally { await app.stop(); repo.dispose(); }
});
