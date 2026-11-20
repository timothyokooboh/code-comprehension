import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    for (const question of quiz.questions) question.references = [{ path: 'payment.ts' }];

test('validates and saves a scoped product bank before serving it through the shared runtime', async () => {
  const repo = createRepository();
  try {
    const bank = { version: 1, id: 'payments', scope: { kind: 'module', name: 'Payments', description: 'Payment retry behaviour', sourcePatterns: ['payment.ts'], supportingFiles: [] }, quiz: { ...quiz, type: 'product' } };
    repo.write('generated.json', JSON.stringify(bank));
    const beforeSetup = runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]);
    expect(beforeSetup.status).toBe(1);
    expect(beforeSetup.stderr).toContain('product');
    expect(existsSync(join(repo.path, '.comprehension'))).toBe(false);
    expect(runCli(['--configure-product', 'git', '--repo', repo.path]).status).toBe(0);
    const invalid = { ...bank, quiz: { ...bank.quiz, questions: [] } };
    repo.write('generated.json', JSON.stringify(invalid));
    const rejected = runCli(['--validate-product', join(repo.path, 'generated.json')]);
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain('quiz.questions');
    expect(existsSync(join(repo.path, '.comprehension/cache/payments.json'))).toBe(false);
    repo.write('generated.json', JSON.stringify(bank));
    expect(runCli(['--validate-product', join(repo.path, 'generated.json')]).status).toBe(0);
    const saved = runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]);
    expect(saved.status, saved.stderr).toBe(0);
    expect(JSON.parse(saved.stdout).status).toBe('saved');
    const stored = JSON.parse(readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8'));
    expect(stored).toMatchObject({ ...bank, version: 2 });
    expect(stored.sources).toEqual([{ path: 'payment.ts', hash: expect.stringMatching(/^[a-f0-9]{64}$/) }]);
    const app = await launchCli(['--product-bank', 'payments', '--repo', repo.path]);
    try {
      const served = await (await fetch(`${app.url}/api/quiz`)).json();
      expect(served.type).toBe('product');
      expect(served.scope).toEqual(['Payments']);
    } finally { await app.stop(); }
    expect(existsSync(join(repo.path, '.comprehension/cache/payments.json'))).toBe(true);
    expect(repo.git('diff', '--cached')).toBe('');
  } finally { repo.dispose(); }
});
