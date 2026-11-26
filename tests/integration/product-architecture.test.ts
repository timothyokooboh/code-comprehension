import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli } from '../support/cli.js';

function legacyBank() {
  const repo = createRepository();
  const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
  for (const question of quiz.questions) question.references = [{ path: 'payment.ts' }];
  repo.write('generated.json', JSON.stringify({ version: 1, id: 'architecture',
    scope: { kind: 'general', focus: 'system_architecture_v1', name: 'Old overview', description: 'System relationships', sourcePatterns: ['payment.ts'], supportingFiles: [] },
    quiz: { ...quiz, type: 'product' } }));
  expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
  expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
  const bank = JSON.parse(readFileSync(join(repo.path, '.comprehension/cache/architecture.json'), 'utf8'));
  delete bank.scope.focus;
  repo.write('.comprehension/cache/architecture.json', JSON.stringify(bank));
  return repo;
}
const check = (repo: string) => JSON.parse(runCli(['--check-product', 'architecture', '--repo', repo]).stdout);

test('unchanged legacy general banks need architecture review and cannot launch', () => {
  const repo = legacyBank();
  try {
    expect(check(repo.path)).toMatchObject({ status: 'review_required', reason: 'architecture_focus', changedFiles: [], requiredFocus: 'system_architecture_v1' });
    expect(runCli(['--product-bank', 'architecture', '--repo', repo.path, '--no-open']).status).toBe(1);
  } finally { repo.dispose(); }
});

test('architecture retention requires explicit semantic confirmation and preserves reviewed questions', () => {
  const repo = legacyBank();
  try {
    const review = check(repo.path);
    const receipt = { bankId: 'architecture', reviewToken: review.reviewToken, confirmed: true, references: [] };
    const retain = (value: unknown) => {
      repo.write('receipt.json', JSON.stringify(value));
      return runCli(['--retain-product', join(repo.path, 'receipt.json'), '--repo', repo.path]);
    };
    expect(retain(receipt).status).toBe(1);
    expect(check(repo.path).status).toBe('review_required');
    expect(retain({ ...receipt, reviewedFocus: 'system_architecture_v1' }).status).toBe(0);
    const upgraded = check(repo.path);
    expect(upgraded).toMatchObject({ status: 'reusable', scope: { focus: 'system_architecture_v1' } });
    const cached = JSON.parse(readFileSync(join(repo.path, '.comprehension/cache/architecture.json'), 'utf8'));
    const original = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    expect(cached.quiz.questions).toEqual(original.quiz.questions);
    repo.write('payment.ts', '// Source changed after semantic review\nexport const retries = 0;\n');
    expect(check(repo.path)).toMatchObject({ status: 'review_required', reason: 'changed', changedFiles: ['payment.ts'] });
  } finally { repo.dispose(); }
});

test('new general banks declare architecture intent; incompatible legacy content can be regenerated', () => {
  const repo = legacyBank();
  try {
    const input = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    delete input.scope.focus;
    repo.write('replacement.json', JSON.stringify(input));
    const invalid = runCli(['--validate-product', join(repo.path, 'replacement.json')]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('scope');
    input.scope.focus = 'system_architecture_v1';
    input.quiz.questions[0].prompt = 'Which boundary prevents malformed generated data from reaching the browser?';
    repo.write('replacement.json', JSON.stringify(input));
    expect(runCli(['--save-product', join(repo.path, 'replacement.json'), '--repo', repo.path]).status).toBe(0);
    expect(check(repo.path).status).toBe('reusable');
    const saved = JSON.parse(readFileSync(join(repo.path, '.comprehension/cache/architecture.json'), 'utf8'));
    expect(saved.quiz.questions[0].prompt).toBe(input.quiz.questions[0].prompt);
  } finally { repo.dispose(); }
});

test('architecture review tokens reject changed evidence and explicit refresh still requires generation', () => {
  const repo = legacyBank();
  try {
    const review = check(repo.path);
    repo.write('receipt.json', JSON.stringify({ bankId: 'architecture', reviewToken: review.reviewToken,
      confirmed: true, reviewedFocus: 'system_architecture_v1', references: [] }));
    repo.write('payment.ts', 'export const retries = 3;\n');
    expect(runCli(['--retain-product', join(repo.path, 'receipt.json'), '--repo', repo.path]).status).toBe(1);
    expect(check(repo.path)).toMatchObject({ status: 'review_required', reason: 'architecture_focus', changedFiles: ['payment.ts'] });
    const refresh = runCli(['--check-product', 'architecture', '--repo', repo.path, '--refresh']);
    expect(JSON.parse(refresh.stdout)).toMatchObject({ status: 'generation_required', reason: 'refresh' });
    expect(JSON.parse(refresh.stdout).reviewToken).toBeUndefined();
  } finally { repo.dispose(); }
});
