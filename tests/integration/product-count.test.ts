import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));

test('product defaults, project settings, and session overrides retain their separate scopes', async () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    const configPath = join(repo.path, '.comprehension/config.json');
    expect(JSON.parse(readFileSync(configPath, 'utf8')).questionsPerSession).toBe(10);
    repo.write('bank.json', JSON.stringify({ version: 1, id: 'overview',
      scope: { kind: 'general', focus: 'system_architecture_v1', name: 'Overview', description: 'Overview', sourcePatterns: ['payment.ts'], supportingFiles: [] },
      quiz: { ...fixture, type: 'product', questions: Array.from({ length: 16 }, (_, i) => ({ ...fixture.questions[0], id: `q${i}`, prompt: `Scenario ${i}`, references: [{ path: 'payment.ts' }] })) },
    }));
    expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    async function launchCount(extra: string[], expected: number) {
      const app = await launchCli(['--product-bank', 'overview', '--repo', repo.path, ...extra]);
      try {
        expect((await (await fetch(`${app.url}/api/quiz`)).json()).selectionSize).toBe(expected);
        if (expected === 3) {
          const active = () => JSON.parse(runCli(['--active-assessment', app.url]).stdout);
          for (const nextCount of [undefined, 2, undefined]) {
            const current = active();
            repo.write('receipt.json', JSON.stringify({ revision: current.revision, displayToken: current.displayToken,
              input: { bankIds: ['overview'], ...(nextCount === undefined ? {} : { questionsPerSession: nextCount }) } }));
            const revised = runCli(['--revise-assessment', join(repo.path, 'receipt.json'), '--runtime', app.url]);
            expect(revised.status, revised.stderr).toBe(0);
            expect(active().quiz.selectionSize).toBe(nextCount ?? current.quiz.selectionSize);
          }
        }
      }
      finally { await app.stop(); }
    }
    await launchCount([], 10);
    repo.write('.comprehension/config.json', JSON.stringify({ version: 1, bankTracking: 'local', questionsPerSession: 6 }));
    await launchCount([], 6);
    await launchCount(['--questions', '3'], 3);
    expect(JSON.parse(readFileSync(configPath, 'utf8')).questionsPerSession).toBe(6);
    expect(runCli(['--configure-product', 'git', '--repo', repo.path]).status).toBe(0);
    expect(JSON.parse(readFileSync(configPath, 'utf8')).questionsPerSession).toBe(6);
    repo.write('.comprehension/config.json', JSON.stringify({ version: 1, bankTracking: 'local' }));
    await launchCount([], 10);
  } finally { repo.dispose(); }
});

test('invalid counts are rejected and product overrides cannot silently apply to PR quizzes', () => {
  for (const value of ['0', '-1', '2.5', 'no', 'Infinity', '9007199254740992']) {
    const invalid = runCli(['--product-bank', 'overview', '--questions', value]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('positive whole number');
  }
  const pr = runCli(['--prepare-pr', '--target', 'main', '--questions', '5']);
  expect(pr.status).toBe(1);
  expect(pr.stderr).toContain('--product-bank');
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    for (const questionsPerSession of [0, -2, 1.5, '5', null]) {
      const content = JSON.stringify({ version: 1, bankTracking: 'local', questionsPerSession });
      repo.write('.comprehension/config.json', content);
      const status = runCli(['--product-status', '--repo', repo.path]);
      expect(status.status).toBe(1);
      expect(status.stderr).toContain('questionsPerSession');
      expect(readFileSync(join(repo.path, '.comprehension/config.json'), 'utf8')).toBe(content);
    }
  } finally { repo.dispose(); }
});
