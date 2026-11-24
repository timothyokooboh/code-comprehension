import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchCli, runCli } from '../support/cli.js';
const fixture = fileURLToPath(new URL('../fixtures/mixed-quiz.json', import.meta.url));

test('retake during written review clears the current UI and survives reload', async ({ page }) => {
  let app = await launchCli(['--quiz', fixture]);
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    const answer = page.getByRole('textbox', { name: 'Your explanation' });
    await answer.fill('My first answer.');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('button', { name: 'Retake quiz' })).toBeVisible();
    const first = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
    await expect(page.getByRole('status').getByText('Reviewing your answer…')).toBeVisible();
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect(answer).toHaveValue('');
    await expect(answer).not.toHaveAttribute('readonly', '');
    await expect(page.getByText(/MCQ score:/)).toHaveCount(0);
    await expect(page.getByRole('status').getByText('Reviewing your answer…')).toHaveCount(0);
    await answer.fill('My new explanation.');
    const file = app.reviewSession!;
    await app.stop('SIGKILL');
    app = await launchCli(['--resume-review', file]);
    await page.reload();
    await expect(answer).toHaveValue('My new explanation.');
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText(/MCQ score:/)).toBeVisible();
    const second = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
    expect(second.submission.attemptId).not.toBe(first.submission.attemptId);
    expect(second.submission.answers.explain).toEqual(['My new explanation.']);
  } finally { await app.stop(); }
});

test('mixed product retakes draw fresh questions and reconcile a lost retake acknowledgement', async ({ page }) => {
  const { mkdtemp, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'mixed-draw-'));
  const original = JSON.parse(await readFile(fixture, 'utf8'));
  const quiz = { ...original, selectionSize: 2, selectionFormat: 'mixed', writtenCount: 1,
    questions: [original.questions[0], original.questions[2]].flatMap(question => [0, 1].map(index => ({ ...question, id: `${question.id}-${index}`, prompt: `${question.prompt} Scenario ${index + 1}.` }))) };
  const path = join(directory, 'quiz.json');
  await writeFile(path, JSON.stringify(quiz));
  const app = await launchCli(['--quiz', path]);
  try {
    await page.goto(app.url);
    const active = async () => (await fetch(app.url + '/api/assessment')).json();
    await expect.poll(async () => (await active()).displayed.length).toBe(2);
    const first = await active();
    await page.getByRole('radio').first().check();
    await page.getByRole('textbox').fill('An uncertain outcome can already include a charge.');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('button', { name: 'Retake quiz' })).toBeVisible();
    let nextIds: string[] = [];
    await page.route('**/api/review/retake', async route => {
      nextIds = route.request().postDataJSON().questionIds;
      await route.fetch();
      await route.abort();
    }, { times: 1 });
    await page.getByRole('button', { name: 'Retake quiz' }).click();
    await expect.poll(() => nextIds.length).toBe(2);
    await page.reload();
    await expect(page.getByRole('textbox')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Submit answers' })).toBeVisible();
    await expect.poll(async () => (await active()).displayed.map((item: { id: string }) => item.id)).toEqual(nextIds);
    expect(nextIds.some(id => first.displayed.some((item: { id: string }) => item.id === id))).toBe(false);
    expect((await active()).displayToken).not.toBe(first.displayToken);
    await expect(page.locator('fieldset')).toHaveCount(1);
    await expect(page.getByRole('textbox')).toHaveCount(1);
    await page.reload();
    await expect.poll(async () => (await active()).displayed.map((item: { id: string }) => item.id)).toEqual(nextIds);
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('identical mixed replacement waits for reload and starts an empty attempt', async ({ page }) => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'mixed-replacement-'));
  const app = await launchCli(['--quiz', fixture]);
  try {
    await page.goto(app.url);
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('textbox').fill('Keep this answer until I reload.');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('button', { name: 'Retake quiz' })).toBeVisible();
    const current = await (await fetch(app.url + '/api/assessment')).json();
    const receipt = join(directory, 'receipt.json');
    await writeFile(receipt, JSON.stringify({ revision: current.revision, displayToken: current.displayToken, input: { quizPath: fixture } }));
    expect(runCli(['--revise-assessment', receipt, '--runtime', app.url]).status).toBe(0);
    await expect(page.getByRole('textbox')).toHaveValue('Keep this answer until I reload.');
    await expect(page.getByRole('alert')).toContainText('Reload');
    await page.reload();
    await expect(page.getByRole('textbox')).toHaveValue('');
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.getByText(/MCQ score:/)).toHaveCount(0);
    await page.getByRole('textbox').fill('My replacement answer.');
    await page.reload();
    await expect(page.getByRole('textbox')).toHaveValue('My replacement answer.');
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('a queued submit cannot attach an old draft to a concurrently retaken attempt', async ({ page }) => {
  const app = await launchCli(['--quiz', fixture]);
  let release: (() => void) | undefined;
  try {
    await page.goto(app.url);
    const session = await (await fetch(app.url + '/api/review/session')).json();
    await page.getByRole('radio').first().check();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('textbox').fill('This belongs only to the old attempt.');
    let polling = false;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/review/state', async route => {
      polling = true;
      await blocked;
      await route.continue();
    }, { times: 1 });
    await expect.poll(() => polling).toBe(true);
    const headers = { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
    const { randomUUID } = await import('node:crypto');
    const changed = await fetch(app.url + '/api/review/retake', { method: 'POST', headers, body: JSON.stringify({ protocolVersion: 1, sessionId: session.sessionId, revision: session.revision,
      attemptId: session.attemptId, nextAttemptId: randomUUID(), questionIds: ['retry', 'guarantees', 'explain'] }) });
    expect(changed.ok).toBe(true);
    await page.getByRole('button', { name: 'Submit answers' }).click();
    release!();
    await expect(page.getByRole('textbox')).toHaveValue('');
    await expect(page.getByRole('alert')).toContainText('changed');
    const current = await (await fetch(app.url + '/api/review/state', { headers })).json();
    expect(current.submission).toBeNull();
  } finally { release?.(); await app.stop(); }
});
