import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchCli, runCli } from '../support/cli.js';
const fixture = fileURLToPath(new URL('../fixtures/mixed-quiz.json', import.meta.url));

test('mixed submission shows per-question feedback automatically above the written answer', async ({ page }) => {
  const app = await launchCli(['--quiz', fixture]);
  const directory = await mkdtemp(join(tmpdir(), 'mixed-browser-'));
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('textbox', { name: 'Your explanation' }).fill('The provider may already have charged.');
    await expect(page.getByRole('button', { name: 'Submit answers' })).toBeEnabled();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('MCQ score: 2 of 2 (100%)')).toBeVisible();
    await expect(page.getByText('Waiting for a reviewer')).toBeVisible();
    const wait = runCli(['--wait-review', app.reviewSession!]);
    expect(wait.status, wait.stderr).toBe(0);
    const job = JSON.parse(wait.stdout);
    await expect(page.getByText('Reviewing your answer…')).toBeVisible();
    const { answers, questionIds, ...identity } = job.submission;
    const feedbackPath = join(directory, 'feedback.json');
    await writeFile(feedbackPath, JSON.stringify({ ...identity, reviews: [{
      questionId: 'explain', verdict: 'correct', summary: 'You explained the uncertain outcome.',
      understood: 'The charge can succeed before the response is lost.', missing: 'No essential gaps.',
      references: [{ path: 'payments.ts' }],
    }] }));
    const result = runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]);
    expect(result.status, result.stderr).toBe(0);
    const feedback = page.getByText('You explained the uncertain outcome.');
    await expect(feedback).toBeVisible();
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    expect((await feedback.boundingBox())!.y).toBeLessThan((await answer.boundingBox())!.y);
    await expect(answer).toHaveValue('The provider may already have charged.');
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('written-only assessment has no numeric score and preserves its submitted answer on reload', async ({ page }) => {
  const directory = await mkdtemp(join(tmpdir(), 'written-only-'));
  const { readFile } = await import('node:fs/promises');
  const quiz = JSON.parse(await readFile(fixture, 'utf8'));
  quiz.questions = quiz.questions.filter((question: { type: string }) => question.type === 'written');
  const path = join(directory, 'quiz.json');
  await writeFile(path, JSON.stringify(quiz));
  const app = await launchCli(['--quiz', path]);
  try {
    await page.goto(app.url);
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('The response can be lost after processing.');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('Waiting for a reviewer')).toBeVisible();
    await expect(page.getByText(/score:/i)).toHaveCount(0);
    await page.reload();
    await expect(answer).toHaveValue('The response can be lost after processing.');
    await expect(page.getByText('Waiting for a reviewer')).toBeVisible();
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('an unresolved submission locks answers and can be retried without changing the payload', async ({ page }) => {
  const app = await launchCli(['--quiz', fixture]);
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('The charge may have succeeded.');
    await page.route('**/api/review/submit', route => route.abort(), { times: 1 });
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('alert')).toContainText('Answers are locked');
    await expect(answer).toHaveAttribute('readonly', '');
    await expect(page.getByRole('radio').first()).toBeDisabled();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('Waiting for a reviewer')).toBeVisible();
    await expect(answer).toHaveValue('The charge may have succeeded.');
  } finally { await app.stop(); }
});
