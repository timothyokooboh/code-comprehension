import { once } from 'node:events';
import { test, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchCli, runCli } from '../support/cli.js';

const fixture = fileURLToPath(new URL('../fixtures/mixed-quiz.json', import.meta.url));

test('retaking pending mixed work rejects old feedback and delivers only the new attempt', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mixed-lifecycle-'));
  const app = await launchCli(['--quiz', fixture]);
  try {
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const send = (path: string, body: unknown) => fetch(app.url + path, { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const attemptId = session.attemptId ?? randomUUID();
    const submission = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId, submissionId: randomUUID(),
      questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['The provider may already have charged.'] } };
    expect((await send('/api/review/submit', submission)).ok).toBe(true);
    const beforeRetake = await (await fetch(app.url + '/api/assessment')).json();
    const first = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
    const nextAttemptId = randomUUID();
    const retake = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId, nextAttemptId, questionIds: submission.questionIds };
    const response = await send('/api/review/retake', retake);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ attemptId: nextAttemptId, submission: null, feedback: null });
    const afterRetake = await (await fetch(app.url + '/api/assessment')).json();
    expect(afterRetake.displayToken).not.toBe(beforeRetake.displayToken);
    const oldDisplay = await fetch(app.url + '/api/assessment/view', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: session.revision, attemptId, questionIds: submission.questionIds }) });
    expect(oldDisplay.status).toBe(409);
    expect(await (await fetch(app.url + '/api/assessment')).json()).toEqual(afterRetake);
    const oldFeedback = join(directory, 'old-feedback.json');
    const { answers, questionIds, ...identity } = submission;
    await writeFile(oldFeedback, JSON.stringify({ ...identity, leaseId: first.leaseId, reviews: [{ questionId: 'explain', verdict: 'correct', summary: 'Old feedback.', understood: 'Uncertainty.', missing: 'No gaps.', references: [{ path: 'payments.ts' }] }] }));
    expect(runCli(['--review-feedback', oldFeedback, '--review-session', app.reviewSession!]).status).toBe(1);
    expect((await send('/api/review/retake', retake)).status).toBe(200);
    expect((await send('/api/review/submit', submission)).status).toBe(409);
    const second = { ...submission, attemptId: nextAttemptId, submissionId: randomUUID() };
    expect((await send('/api/review/submit', second)).ok).toBe(true);
    const nextJob = JSON.parse(runCli(['--wait-review', app.reviewSession!]).stdout);
    expect(nextJob.submission).toEqual(second);
    expect(nextJob.leaseId).not.toBe(first.leaseId);
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('identical replacement supersedes pending work atomically and survives resume', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mixed-replace-'));
  let app = await launchCli(['--quiz', fixture]);
  try {
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const active = await (await fetch(app.url + '/api/assessment')).json();
    const submission = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, submissionId: randomUUID(),
      questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['The provider may have charged.'] } };
    const submit = await fetch(app.url + '/api/review/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' }, body: JSON.stringify(submission) });
    expect(submit.ok).toBe(true);
    const receipt = join(directory, 'receipt.json');
    await writeFile(receipt, JSON.stringify({ revision: active.revision, displayToken: active.displayToken, input: { quizPath: fixture } }));
    const replaced = runCli(['--revise-assessment', receipt, '--runtime', app.url]);
    expect(replaced.status, replaced.stderr).toBe(0);
    const next = await (await fetch(app.url + '/api/review/session')).json();
    expect(next.attemptId).not.toBe(session.attemptId);
    expect(next.revision).not.toBe(session.revision);
    const file = app.reviewSession!;
    await app.stop('SIGKILL');
    app = await launchCli(['--resume-review', file]);
    const restored = await (await fetch(app.url + '/api/review/state', { headers: { Authorization: 'Bearer ' + next.token } })).json();
    expect(restored).toMatchObject({ attemptId: next.attemptId, revision: next.revision, submission: null, feedback: null });
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});

test('a waiting reviewer receives subsequent attempts and session closure cancels its wait', async () => {
  const { spawn } = await import('node:child_process');
  const directory = await mkdtemp(join(tmpdir(), 'mixed-wait-loop-'));
  const app = await launchCli(['--quiz', fixture]);
  const children: ReturnType<typeof spawn>[] = [];
  function wait() {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../../packages/cli/dist/index.js', import.meta.url)), '--wait-review', app.reviewSession!]);
    children.push(child);
    let output = '';
    child.stdout!.on('data', chunk => { output += chunk; });
    child.stderr!.resume();
    const exited = once(child, 'exit');
    return { exited, job: async () => { await exited; return JSON.parse(output); } };
  }
  try {
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const headers = { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
    const state = async () => (await (await fetch(app.url + '/api/review/state', { headers })).json());
    const firstWait = wait();
    await expect.poll(async () => (await state()).status).toBe('waiting');
    let submission = { protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, submissionId: randomUUID(), questionIds: ['retry', 'guarantees', 'explain'], answers: { retry: ['retry'], guarantees: ['key'], explain: ['The outcome is uncertain.'] } };
    const submit = () => fetch(app.url + '/api/review/submit', { method: 'POST', headers, body: JSON.stringify(submission) });
    expect((await submit()).ok).toBe(true);
    const first = await firstWait.job();
    const feedbackPath = join(directory, 'feedback.json');
    async function feedback(job: typeof first) {
      const { answers, questionIds, ...identity } = job.submission;
      await writeFile(feedbackPath, JSON.stringify({ ...identity, leaseId: job.leaseId, reviews: [{ questionId: 'explain', verdict: 'partial', summary: 'Add duplicate risk.', understood: 'Uncertain outcome.', missing: 'Idempotency prevents duplicates.', references: [{ path: 'payments.ts' }] }] }));
      return runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]);
    }
    expect((await feedback(first)).status).toBe(0);
    const secondWait = wait();
    const nextAttemptId = randomUUID();
    expect((await fetch(app.url + '/api/review/retake', { method: 'POST', headers, body: JSON.stringify({ protocolVersion: 1, sessionId: session.sessionId, revision: session.revision, attemptId: session.attemptId, nextAttemptId, questionIds: submission.questionIds }) })).ok).toBe(true);
    submission = { ...submission, attemptId: nextAttemptId, submissionId: randomUUID() };
    expect((await submit()).ok).toBe(true);
    const second = await secondWait.job();
    expect(second.submission.attemptId).toBe(nextAttemptId);
    expect((await feedback(first)).status).toBe(1);
    expect((await feedback(second)).status).toBe(0);
    expect((await feedback(second)).status).toBe(0);
    const lastWait = wait();
    await app.stop();
    expect((await lastWait.exited)[0]).toBe(1);
  } finally {
    for (const child of children) child.kill();
    await app.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
