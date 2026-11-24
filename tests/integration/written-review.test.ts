import { test, expect } from 'vitest';
import { quizSchema, scoreQuiz } from '../../packages/quiz-contract/src/index.js';
import fixture from '../fixtures/quiz.json' with { type: 'json' };

test('version two accepts written questions without options and scores only MCQs', () => {
  const quiz = quizSchema.parse({ ...fixture, schemaVersion: 2, questions: [fixture.questions[0], {
    id: 'explain', type: 'written', prompt: 'Why reuse the key?',
    criteria: ['Explain the uncertain provider outcome.'],
    explanation: { concise: 'Avoid duplicates.', detailed: 'A timeout may follow a successful charge.' },
    references: [{ path: 'payments.ts' }],
  }] });
  expect(scoreQuiz(quiz, new Map([['retry', ['retry']], ['explain', ['A timeout is uncertain.']]]))).toMatchObject({ total: 1, correct: 1, percentage: 100 });
  const invalid = quizSchema.safeParse({ ...quiz, questions: [{ ...quiz.questions[1], criteria: [] }] });
  expect(invalid.success).toBe(false);
});

import { launchCli, runCli } from '../support/cli.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

test('a disconnected submission is queued and reviewed through the public CLI', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'written-review-test-'));
  const path = join(directory, 'quiz.json');
  await writeFile(path, JSON.stringify({ ...fixture, schemaVersion: 2, questions: [{
    id: 'explain', type: 'written', prompt: 'Why reuse the key?',
    criteria: ['Explain the uncertain provider outcome.'],
    explanation: { concise: 'Avoid duplicates.', detailed: 'A timeout may follow a successful charge.' },
    references: [{ path: 'payments.ts' }],
  }] }));
  const app = await launchCli(['--quiz', path]);
  try {
    const session = await (await fetch(app.url + '/api/review/session')).json();
    const submission = { protocolVersion: session.protocolVersion, sessionId: session.sessionId, revision: session.revision,
      attemptId: randomUUID(), submissionId: randomUUID(), questionIds: ['explain'],
      answers: { explain: ['The provider may have charged already.'] } };
    const response = await fetch(app.url + '/api/review/submit', { method: 'POST',
      headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' }, body: JSON.stringify(submission) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'disconnected', submission });
    const unauthorized = await fetch(app.url + '/api/review/wait', { headers: { Authorization: 'Bearer ' + session.token } });
    expect(unauthorized.status).toBe(403);
    expect((await fetch(app.url + '/api/review/session', { headers: { Origin: 'https://example.org' } })).status).toBe(403);
    expect((await fetch(app.url + '/api/review/submit', { method: 'POST',
      headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...submission, revision: randomUUID() }) })).status).toBe(409);
    const wait = runCli(['--wait-review', app.reviewSession!]);
    expect(wait.status, wait.stderr).toBe(0);
    const job = JSON.parse(wait.stdout);
    expect(job.submission).toEqual(submission);
    const feedback = { ...submission, reviews: [{ questionId: 'explain', verdict: 'correct', summary: 'Correct reasoning.', understood: 'The uncertain outcome.', missing: 'No essential gaps.', references: [{ path: 'payments.ts' }] }] };
    const { answers: _, questionIds: __, ...review } = feedback;
    const feedbackPath = join(directory, 'feedback.json');
    await writeFile(feedbackPath, JSON.stringify(review));
    await writeFile(feedbackPath, JSON.stringify({ ...review, reviews: [{ ...review.reviews[0], summary: '' }] }));
    const invalid = runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('reviews.0.summary');
    await writeFile(feedbackPath, JSON.stringify({ ...review, attemptId: randomUUID() }));
    expect(runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]).status).toBe(1);
    await writeFile(feedbackPath, JSON.stringify({ ...review, protocolVersion: 99 }));
    const unsupported = runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]);
    expect(unsupported.status).toBe(1);
    expect(unsupported.stderr).toContain('protocolVersion');
    await writeFile(feedbackPath, JSON.stringify(review));
    const result = runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]);
    expect(result.status, result.stderr).toBe(0);
    expect(runCli(['--review-feedback', feedbackPath, '--review-session', app.reviewSession!]).status).toBe(0);
  } finally { await app.stop(); await rm(directory, { recursive: true, force: true }); }
});
