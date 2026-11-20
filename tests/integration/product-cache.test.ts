import { readFileSync, cpSync, mkdirSync, utimesSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli } from '../support/cli.js';

function prepareBank(repo: ReturnType<typeof createRepository>) {
  const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
  for (const question of quiz.questions) question.references = [{ path: 'payment.ts' }];
  const bank = { version: 1, id: 'payments', scope: { kind: 'module', name: 'Payments', description: 'Retries', sourcePatterns: ['*.ts'], supportingFiles: [] }, quiz: { ...quiz, type: 'product' } };
  repo.write('generated.json', JSON.stringify(bank));
  expect(runCli(['--configure-product', 'git', '--repo', repo.path]).status).toBe(0);
  const saved = runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]);
  expect(saved.status, saved.stderr).toBe(0);
}

const check = (repo: string, extra: string[] = []) => {
  const result = runCli(['--check-product', 'payments', '--repo', repo, ...extra]);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
};

test('unchanged banks can be reused in another checkout and refresh requests generation', () => {
  const first = createRepository();
  const second = createRepository();
  try {
    prepareBank(first);
    expect(check(first.path).status).toBe('reusable');
    cpSync(join(first.path, '.comprehension'), join(second.path, '.comprehension'), { recursive: true });
    expect(check(second.path).status).toBe('reusable');
    expect(check(second.path, ['--refresh'])).toMatchObject({ status: 'generation_required', reason: 'refresh' });
    expect(check(first.path).status).toBe('reusable');
  } finally { first.dispose(); second.dispose(); }
});

test('source edits, additions, deletions, and supporting changes block launch without rewriting a bank', () => {
  const repo = createRepository();
  try {
    repo.write('shared.json', '{"mode":"safe"}');
    prepareBank(repo);
    const input = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    input.scope.supportingFiles = ['shared.json'];
    repo.write('generated.json', JSON.stringify(input));
    expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
    const original = readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8');
    repo.write('payment.ts', 'export const retries = 9;\n');
    expect(check(repo.path)).toMatchObject({ status: 'review_required', reason: 'changed', changedFiles: ['payment.ts'] });
    expect(runCli(['--product-bank', 'payments', '--repo', repo.path, '--no-open']).status).toBe(1);
    repo.write('payment.ts', 'export const retries = 0;\n');
    repo.write('new.ts', 'export const enabled = true;');
    expect(check(repo.path).changedFiles).toContain('new.ts');
    repo.git('clean', '-f', '--', 'new.ts');
    repo.write('shared.json', '{"mode":"unsafe"}');
    expect(check(repo.path).changedFiles).toEqual(['shared.json']);
    repo.write('shared.json', '{"mode":"safe"}');
    repo.git('rm', 'payment.ts');
    expect(check(repo.path).changedFiles).toEqual(['payment.ts']);
    expect(readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8')).toBe(original);
  } finally { repo.dispose(); }
});

test('missing and incompatible banks require generation, while generated output does not invalidate sources', () => {
  const repo = createRepository();
  try {
    prepareBank(repo);
    repo.write('.comprehension/cache/unrelated.json', '{}');
    expect(check(repo.path).status).toBe('reusable');
    const path = join(repo.path, '.comprehension/cache/payments.json');
    const bank = JSON.parse(readFileSync(path, 'utf8'));
    repo.write('.comprehension/cache/payments.json', JSON.stringify({ ...bank, version: 999 }));
    expect(check(repo.path)).toMatchObject({ status: 'generation_required', reason: 'incompatible' });
    const missing = runCli(['--check-product', 'missing', '--repo', repo.path]);
    expect(JSON.parse(missing.stdout).reason).toBe('missing');
  } finally { repo.dispose(); }
});


test('broad scopes exclude generated directories and use content rather than modification times', () => {
  const repo = createRepository();
  try {
    prepareBank(repo);
    const bank = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    bank.scope.sourcePatterns = ['.'];
    repo.write('generated.json', JSON.stringify(bank));
    expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
    mkdirSync(join(repo.path, 'dist'));
    repo.write('dist/output.js', 'generated output');
    repo.git('add', 'dist/output.js');
    repo.write('.comprehension/cache/other.json', '{}');
    utimesSync(join(repo.path, 'payment.ts'), new Date(0), new Date(0));
    expect(check(repo.path).status).toBe('reusable');
  } finally { repo.dispose(); }
});


test('supporting files cannot bypass generated-output exclusions through a directory alias', () => {
  const repo = createRepository();
  try {
    prepareBank(repo);
    mkdirSync(join(repo.path, 'dist'));
    repo.write('dist/output.js', 'generated output');
    symlinkSync(join(repo.path, 'dist'), join(repo.path, 'alias'), 'dir');
    const bank = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    bank.scope.supportingFiles = ['alias/output.js'];
    repo.write('generated.json', JSON.stringify(bank));
    const saved = runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]);
    expect(saved.status).toBe(1);
    expect(saved.stderr).toContain('outside generated output');
  } finally { repo.dispose(); }
});
