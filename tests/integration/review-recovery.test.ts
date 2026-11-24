import { test, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { launchCli, runCli } from '../support/cli.js';
const fixture = fileURLToPath(new URL('../fixtures/mixed-quiz.json', import.meta.url));
test('a crashed runtime resumes the same accepted submission without browser resubmission', async () => {
  const app = await launchCli(['--quiz', fixture]);
  const session = await (await fetch(app.url + '/api/review/session')).json();
  const submission = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision,
    attemptId: session.attemptId, submissionId: randomUUID(), questionIds: ['retry', 'guarantees', 'explain'],
    answers: { retry: ['retry'], guarantees: ['key'], explain: ['The provider may already have charged.'] } };
  const response = await fetch(app.url + '/api/review/submit', { method: 'POST',
    headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' }, body: JSON.stringify(submission) });
  expect(response.status).toBe(200);
  await app.stop('SIGKILL');
  const resumed = await launchCli(['--resume-review', app.reviewSession!]);
  try {
    expect(resumed.url).toBe(app.url);
    const current = await (await fetch(resumed.url + '/api/review/session')).json();
    expect(current.sessionId).toBe(session.sessionId);
    const job = runCli(['--wait-review', resumed.reviewSession!]);
    expect(job.status, job.stderr).toBe(0);
    expect(JSON.parse(job.stdout).submission).toEqual(submission);
  } finally { await resumed.stop(); }
  await expect(access(app.reviewSession!)).rejects.toThrow();
  const missing = runCli(['--resume-review', app.reviewSession!]);
  expect(missing.status).toBe(1);
  expect(missing.stderr).toContain('recovery');
});

test('completed feedback survives restart and duplicate runtimes are rejected', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'review-feedback-test-'));
  const app = await launchCli(['--quiz', fixture]);
  expect(runCli(['--resume-review', app.reviewSession!]).stderr).toContain('already has a running runtime');
  const session = await (await fetch(app.url + '/api/review/session')).json();
  const identity = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, submissionId: randomUUID() };
  const submit = await fetch(app.url + '/api/review/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...identity, questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['An uncertain outcome.'] } }) });
  expect(submit.ok).toBe(true);
  const job = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
  const feedback = { ...identity, leaseId: job.leaseId, reviews: [{ questionId: 'explain', verdict: 'partial', summary: 'Add the consequence.', understood: 'The outcome is uncertain.', missing: 'Explain duplicate charge risk.', references: [{ path: 'payments.ts' }] }] };
  const file = join(directory, 'feedback.json');
  await writeFile(file, JSON.stringify(feedback));
  expect(runCli(['--review-feedback', file, '--review-session', app.reviewSession!]).status).toBe(0);
  await app.stop('SIGKILL');
  const resumed = await launchCli(['--resume-review', app.reviewSession!]);
  try {
    const response = await fetch(resumed.url + '/api/review/state', { headers: { Authorization: 'Bearer ' + session.token } });
    expect(await response.json()).toMatchObject({ status: 'completed', feedback });
  } finally { await resumed.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('corrupt recovery never launches a fresh quiz and can be explicitly discarded', async () => {
  const { writeFile } = await import('node:fs/promises');
  const app = await launchCli(['--quiz', fixture]);
  await app.stop('SIGKILL');
  await writeFile(app.reviewSession!, '{broken');
  const result = runCli(['--resume-review', app.reviewSession!]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('missing or corrupt');
  expect(runCli(['--close-review', app.reviewSession!]).status).toBe(0);
  await expect(access(app.reviewSession!)).rejects.toThrow();
});

test('review failure is visible and reconnect retrieves the same pending job', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'review-failure-test-'));
  const app = await launchCli(['--quiz', fixture]);
  try {
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const identity = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, submissionId: randomUUID() };
    await fetch(app.url + '/api/review/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identity, questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['An uncertain outcome.'] } }) });
    const first = runCli(['--wait-review', app.reviewSession!]);
    const file = join(directory, 'failure.json');
    await writeFile(file, JSON.stringify({ ...identity, leaseId: JSON.parse(first.stdout).leaseId }));
    const failure = runCli(['--review-failure', file, '--review-session', app.reviewSession!]);
    expect(failure.status, failure.stderr).toBe(0);
    const state = await (await fetch(app.url + '/api/review/state', { headers: { Authorization: 'Bearer ' + session.token } })).json();
    expect(state.status).toBe('failed');
    expect(JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout).submission).toEqual(JSON.parse(first.stdout).submission);
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('an expired lease requeues the same job and retention expiry deletes private recovery files', async () => {
  const { mkdtemp, writeFile, rm, stat } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join, dirname } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'review-clock-test-'));
  const clock = join(directory, 'clock');
  const now = Date.now();
  await writeFile(clock, String(now));
  const env = { ...process.env, REVIEW_TEST_CLOCK: clock, NODE_OPTIONS: `--import=${fileURLToPath(new URL('../support/clock.mjs', import.meta.url))}` };
  const app = await launchCli(['--quiz', fixture], env);
  try {
    expect((await stat(app.reviewSession!)).mode & 0o077).toBe(0);
    expect((await stat(dirname(app.reviewSession!))).mode & 0o077).toBe(0);
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const identity = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, submissionId: randomUUID() };
    await fetch(app.url + '/api/review/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identity, questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['An uncertain outcome.'] } }) });
    const first = runCli(['--wait-review', app.reviewSession!]);
    const state = async () => (await fetch(app.url + '/api/review/state', { headers: { Authorization: 'Bearer ' + session.token } })).json();
    expect((await state()).status).toBe('reviewing');
    await writeFile(clock, String(now + 121_000));
    expect((await state()).status).toBe('disconnected');
    const replacement = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
    expect(replacement.submission).toEqual(JSON.parse(first.stdout).submission);
    expect(replacement.leaseId).not.toBe(JSON.parse(first.stdout).leaseId);
    const lateFailure = join(directory, 'late-failure.json');
    await writeFile(lateFailure, JSON.stringify({ ...identity, leaseId: JSON.parse(first.stdout).leaseId }));
    expect(runCli(['--review-failure', lateFailure, '--review-session', app.reviewSession!]).status).toBe(1);
    expect((await state()).status).toBe('reviewing');
    await app.stop('SIGKILL');
    await writeFile(clock, String(now + 25 * 60 * 60 * 1000));
    const expired = runCli(['--resume-review', app.reviewSession!], env);
    expect(expired.status).toBe(1);
    await expect(access(app.reviewSession!)).rejects.toThrow();
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('competing resumes cannot release or delete the surviving runtime ownership', async () => {
  const app = await launchCli(['--quiz', fixture]);
  await app.stop('SIGKILL');
  const attempts = await Promise.allSettled([
    launchCli(['--resume-review', app.reviewSession!]),
    launchCli(['--resume-review', app.reviewSession!]),
  ]);
  const running = attempts.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
  expect(running.length).toBeLessThanOrEqual(1);
  // Both contenders may safely back off; the next explicit resume can then win.
  const owner = running[0] ?? await launchCli(['--resume-review', app.reviewSession!]);
  try {
    expect(runCli(['--close-review', app.reviewSession!]).status).toBe(1);
    await expect(access(app.reviewSession!)).resolves.toBeUndefined();
    expect((await fetch(owner.url + '/api/review/session')).ok).toBe(true);
  } finally { await owner.stop(); }
});
