import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));

test('reports displayed question numbers and validates replacements without losing the current assessment', async () => {
  const repo = createRepository();
  repo.write('quiz.json', JSON.stringify(fixture));
  const app = await launchCli(['--quiz', join(repo.path, 'quiz.json')]);
  try {
    const active = () => JSON.parse(runCli(['--active-assessment', app.url]).stdout);
    const initial = active();
    expect(initial.displayed).toEqual([]);
    const displayed = await fetch(`${app.url}/api/assessment/view`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: initial.revision, questionIds: ['guarantees', 'retry'] }) });
    expect(displayed.ok).toBe(true);
    const current = active();
    expect(current.displayed).toEqual([{ number: 1, id: 'guarantees' }, { number: 2, id: 'retry' }]);
    expect(current.quiz.questions).toHaveLength(2);
    const receipt = { revision: current.revision, displayToken: current.displayToken, input: { quizPath: join(repo.path, 'revised.json') } };
    repo.write('receipt.json', JSON.stringify(receipt));
    repo.write('revised.json', JSON.stringify({ ...fixture, questions: [] }));
    const revise = () => runCli(['--revise-assessment', join(repo.path, 'receipt.json'), '--runtime', app.url]);
    expect(revise().status).toBe(1);
    expect(active()).toEqual(current);
    repo.write('revised.json', JSON.stringify({ ...fixture, title: 'Revised assessment' }));
    const accepted = revise();
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(accepted.stdout).toContain('Reload');
    const next = active();
    expect(next.revision).not.toBe(current.revision);
    expect(next.quiz.title).toBe('Revised assessment');
    expect(next.displayed).toEqual([]);
    expect(revise().status).toBe(1);
    expect(active()).toEqual(next);
  } finally { await app.stop(); repo.dispose(); }
});

test('PR revisions verify the original comparison and keep temporary session cleanup', async () => {
  const repo = createRepository();
  repo.write('payment.ts', 'export const retries = 3;');
  const prepared = JSON.parse(runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main', '--baseline', repo.baseline]).stdout);
  writeFileSync(prepared.quizPath, JSON.stringify({ ...fixture, type: 'pr' }));
  const app = await launchCli(['--pr-session', prepared.directory]);
  try {
    const initial = JSON.parse(runCli(['--active-assessment', app.url]).stdout);
    const replacementPath = join(prepared.directory, 'replacement.json');
    writeFileSync(replacementPath, JSON.stringify({ ...fixture, type: 'pr', title: 'Focused retry behaviour' }));
    const receiptPath = join(prepared.directory, 'receipt.json');
    const receipt = (active: typeof initial) => writeFileSync(receiptPath, JSON.stringify({ revision: active.revision, displayToken: active.displayToken, input: { quizPath: replacementPath } }));
    receipt(initial);
    expect(runCli(['--revise-assessment', receiptPath, '--runtime', app.url]).status).toBe(0);
    const revised = JSON.parse(runCli(['--active-assessment', app.url]).stdout);
    expect(revised.quiz.comparison).toEqual(initial.quiz.comparison);
    expect(revised.quiz.id).toBe(initial.quiz.id);
    expect(revised.source.directory).toBe(prepared.directory);
    receipt(revised);
    repo.write('payment.ts', 'export const retries = 9;');
    const stale = runCli(['--revise-assessment', receiptPath, '--runtime', app.url]);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('code or comparison changed');
    expect(JSON.parse(runCli(['--active-assessment', app.url]).stdout)).toEqual(revised);
    expect(existsSync(join(repo.path, '.comprehension'))).toBe(false);
  } finally {
    await app.stop();
    expect(existsSync(prepared.directory)).toBe(false);
    repo.dispose();
  }
});

test('product scope revisions load validated saved banks without changing cache tracking policy', async () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    for (const id of ['payments', 'retries']) {
      repo.write('bank.json', JSON.stringify({ version: 1, id,
        scope: { kind: 'module', name: id, description: id, sourcePatterns: ['payment.ts'], supportingFiles: [] },
        quiz: { ...fixture, type: 'product', title: id, questions: fixture.questions.map((question: { id: string }) => ({ ...question, references: [{ path: 'payment.ts' }] })) },
      }));
      expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    }
    const nested = join(repo.path, 'nested');
    mkdirSync(nested);
    const app = await launchCli(['--product-bank', 'payments', '--repo', nested]);
    try {
      const active = () => JSON.parse(runCli(['--active-assessment', app.url]).stdout);
      const current = active();
      expect(current.source.repo).toBe(repo.git('rev-parse', '--show-toplevel'));
      repo.write('receipt.json', JSON.stringify({ revision: current.revision, displayToken: current.displayToken, input: { bankIds: ['missing'] } }));
      const revise = () => runCli(['--revise-assessment', join(repo.path, 'receipt.json'), '--runtime', app.url]);
      expect(revise().status).toBe(1);
      expect(active()).toEqual(current);
      repo.write('receipt.json', JSON.stringify({ revision: current.revision, displayToken: current.displayToken, input: { bankIds: ['retries'] } }));
      expect(revise().status).toBe(0);
      expect(active()).toMatchObject({ source: { kind: 'product', bankIds: ['retries'] }, quiz: { title: 'retries', scope: ['retries'] } });
      const revised = active();
      repo.write('receipt.json', JSON.stringify({ revision: revised.revision, displayToken: revised.displayToken, input: { quizPath: join(repo.path, 'bank.json') } }));
      expect(revise().status).toBe(1);
      repo.write('payment.ts', 'export const retries = 7;');
      repo.write('receipt.json', JSON.stringify({ revision: revised.revision, displayToken: revised.displayToken, input: { bankIds: ['retries'] } }));
      expect(revise().status).toBe(1);
      expect(active()).toEqual(revised);
      expect(JSON.parse(readFileSync(join(repo.path, '.comprehension/config.json'), 'utf8')).bankTracking).toBe('local');
      expect(repo.git('ls-files', '.comprehension/cache')).toBe('');
    } finally { await app.stop(); }
    expect(existsSync(join(repo.path, '.comprehension/cache/retries.json'))).toBe(true);
  } finally { repo.dispose(); }
});

test('stale display receipts and cross-origin mutations cannot replace the active assessment', async () => {
  const repo = createRepository();
  repo.write('quiz.json', JSON.stringify(fixture));
  const app = await launchCli(['--quiz', join(repo.path, 'quiz.json')]);
  try {
    const active = async () => (await fetch(`${app.url}/api/assessment`)).json();
    const initial = await active();
    const publish = (questionIds: string[]) => fetch(`${app.url}/api/assessment/view`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: initial.revision, questionIds }) });
    expect((await publish(['retry', 'guarantees'])).ok).toBe(true);
    const beforeRetake = await active();
    expect((await publish(['guarantees', 'retry'])).ok).toBe(true);
    const current = await active();
    const receipt = { revision: initial.revision, displayToken: beforeRetake.displayToken, input: { quizPath: join(repo.path, 'quiz.json') } };
    const stale = await fetch(`${app.url}/api/assessment/revise`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(receipt) });
    expect(stale.status).toBe(409);
    const crossOrigin = await fetch(`${app.url}/api/assessment/revise`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify({ ...receipt, displayToken: current.displayToken }) });
    expect(crossOrigin.status).toBe(400);
    expect((await publish(['missing', 'retry'])).status).toBe(400);
    expect(await active()).toEqual(current);
    const remote = runCli(['--active-assessment', 'https://example.com']);
    expect(remote.status).toBe(1);
    expect(remote.stderr).toContain('http://127.0.0.1:PORT');
  } finally { await app.stop(); repo.dispose(); }
});

test.each(['runtimeRevision', 'attemptRevision'])('%s metadata cannot become product bank data', (field) => {
  const repo = createRepository();
  try {
    repo.write('bank.json', JSON.stringify({ version: 1, id: 'payments',
      scope: { kind: 'module', name: 'Payments', description: 'Payments', sourcePatterns: ['payment.ts'], supportingFiles: [] },
      quiz: { ...fixture, type: 'product', [field]: '123e4567-e89b-42d3-a456-426614174000', questions: fixture.questions.map((question: { id: string }) => ({ ...question, references: [{ path: 'payment.ts' }] })) },
    }));
    const invalid = runCli(['--validate-product', join(repo.path, 'bank.json')]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('runtime revision');
  } finally { repo.dispose(); }
});
