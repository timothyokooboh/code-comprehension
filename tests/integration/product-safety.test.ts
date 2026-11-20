import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli } from '../support/cli.js';

test('local-only preference reports tracked cache files without staging or removing them', () => {
  const repo = createRepository();
  try {
    mkdirSync(join(repo.path, '.comprehension/cache'), { recursive: true });
    repo.write('.comprehension/cache/existing.json', '{}');
    repo.git('add', '.comprehension/cache/existing.json');
    const staged = repo.git('diff', '--cached');
    const result = runCli(['--configure-product', 'local', '--repo', repo.path]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).conflicts).toEqual([expect.objectContaining({ code: 'cache_tracked', rule: '.comprehension/cache/existing.json' })]);
    expect(repo.git('diff', '--cached')).toBe(staged);
    expect(readFileSync(join(repo.path, '.comprehension/cache/existing.json'), 'utf8')).toBe('{}');
  } finally { repo.dispose(); }
});

test('invalid replacement banks leave the saved bank intact and cannot escape the cache directory', () => {
  const repo = createRepository();
  try {
    const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    for (const question of quiz.questions) question.references = [{ path: 'payment.ts' }];
    const bank = { version: 1, id: 'payments', scope: { kind: 'module', name: 'Payments', description: 'Retry behaviour', sourcePatterns: ['payment.ts'], supportingFiles: [] }, quiz: { ...quiz, type: 'product' } };
    repo.write('generated.json', JSON.stringify(bank));
    expect(runCli(['--configure-product', 'git', '--repo', repo.path]).status).toBe(0);
    const args = ['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path];
    expect(runCli(args).status).toBe(0);
    const saved = readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8');
    repo.write('generated.json', JSON.stringify({ ...bank, id: '../config' }));
    expect(runCli(args).status).toBe(1);
    repo.write('generated.json', JSON.stringify({ ...bank, score: 100 }));
    expect(runCli(args).status).toBe(1);
    repo.write('generated.json', JSON.stringify({ ...bank, scope: { ...bank.scope, sourcePatterns: ['/machine-specific/source'] } }));
    expect(runCli(args).status).toBe(1);
    expect(readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8')).toBe(saved);
    expect(runCli(['--product-bank', '../config', '--repo', repo.path]).status).toBe(1);
  } finally { repo.dispose(); }
});
