import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

function setup() {
  const repo = createRepository();
  const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
  for (const question of quiz.questions) question.references = [{ path: 'payment.ts', line: 1 }];
  const bank = { version: 1, id: 'payments', scope: { kind: 'general', focus: 'system_architecture_v1', name: 'System overview', description: 'Payment behaviour', sourcePatterns: ['*.ts'], supportingFiles: [] }, quiz: { ...quiz, type: 'product' } };
  repo.write('generated.json', JSON.stringify(bank));
  expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
  expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
  return repo;
}
const check = (repo: string) => JSON.parse(runCli(['--check-product', 'payments', '--repo', repo]).stdout);

test('changed sources require explicit review before retained questions and corrected references can launch', async () => {
  const repo = setup();
  try {
    const path = join(repo.path, '.comprehension/cache/payments.json');
    const before = readFileSync(path, 'utf8');
    repo.write('payment.ts', '// Retry configuration\nexport const retries = 0;\n');
    const review = check(repo.path);
    expect(review.status).toBe('review_required');
    expect(review.changedFiles).toEqual(['payment.ts']);
    expect(readFileSync(path, 'utf8')).toBe(before);
    expect(runCli(['--product-bank', 'payments', '--repo', repo.path, '--no-open']).status).toBe(1);
    repo.write('review.json', JSON.stringify({ bankId: 'payments', reviewToken: review.reviewToken, confirmed: true, references: [
      { questionId: 'retry', referenceIndex: 0, line: 2 }, { questionId: 'guarantees', referenceIndex: 0, line: 2 },
    ] }));
    const retained = runCli(['--retain-product', join(repo.path, 'review.json'), '--repo', repo.path]);
    expect(retained.status, retained.stderr).toBe(0);
    expect(JSON.parse(retained.stdout).status).toBe('retained');
    expect(check(repo.path).status).toBe('reusable');
    const after = JSON.parse(readFileSync(path, 'utf8'));
    expect(after.quiz.questions[0].prompt).toBe(JSON.parse(before).quiz.questions[0].prompt);
    expect(after.quiz.questions[0].references[0].line).toBe(2);
    const app = await launchCli(['--product-bank', 'payments', '--repo', repo.path]);
    try {
      const served = await (await fetch(`${app.url}/api/quiz`)).json();
      expect(served.questions[0].references[0].line).toBe(2);
    } finally { await app.stop(); }
  } finally { repo.dispose(); }
});

test('missing confirmation, invalid corrections, and stale review tokens cannot refresh fingerprints', () => {
  const repo = setup();
  try {
    repo.write('payment.ts', '// Cosmetic heading\nexport const retries = 0;\n');
    const review = check(repo.path);
    const path = join(repo.path, '.comprehension/cache/payments.json');
    const original = readFileSync(path, 'utf8');
    const receipt = { bankId: 'payments', reviewToken: review.reviewToken, confirmed: false, references: [] as { questionId: string; referenceIndex: number; line: number }[] };
    const retain = () => {
      repo.write('review.json', JSON.stringify(receipt));
      return runCli(['--retain-product', join(repo.path, 'review.json'), '--repo', repo.path]);
    };
    expect(retain().status).toBe(1);
    receipt.confirmed = true;
    receipt.references = [{ questionId: 'retry', referenceIndex: 0, line: 9999 }];
    expect(retain().status).toBe(1);
    receipt.references = [];
    const edited = JSON.parse(original);
    edited.quiz.title = 'Changed bank content';
    repo.write('.comprehension/cache/payments.json', JSON.stringify(edited));
    expect(retain().status).toBe(1);
    repo.write('.comprehension/cache/payments.json', original);
    repo.write('payment.ts', 'export const retries = 5;\n');
    expect(retain().status).toBe(1);
    expect(readFileSync(path, 'utf8')).toBe(original);
    const refreshed = runCli(['--check-product', 'payments', '--repo', repo.path, '--refresh']);
    expect(JSON.parse(refreshed.stdout)).toMatchObject({ status: 'generation_required', reason: 'refresh' });
    expect(JSON.parse(refreshed.stdout).reviewToken).toBeUndefined();
    expect(runCli(['--retain-product', join(repo.path, 'review.json'), '--repo', repo.path, '--refresh']).status).toBe(1);
  } finally { repo.dispose(); }
});

test('semantic supporting-input changes can regenerate a general bank instead of retaining old answers', () => {
  const repo = setup();
  try {
    repo.write('policy.json', '{"refundWindowDays":30}');
    const input = JSON.parse(readFileSync(join(repo.path, 'generated.json'), 'utf8'));
    input.scope.supportingFiles = ['policy.json'];
    repo.write('generated.json', JSON.stringify(input));
    expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
    repo.write('policy.json', '{"refundWindowDays":14}');
    expect(check(repo.path)).toMatchObject({ status: 'review_required', changedFiles: ['policy.json'] });
    input.quiz.questions[0].prompt = 'What happens to a refund requested after 20 days?';
    input.quiz.questions[0].options = [{ id: 'allowed', text: 'It is within the window.' }, { id: 'denied', text: 'It is outside the window.' }];
    input.quiz.questions[0].correctOptionIds = ['denied'];
    input.quiz.questions[0].references = [{ path: 'policy.json', line: 1 }];
    input.quiz.questions[0].explanation = { concise: 'Twenty days exceeds fourteen.', detailed: 'The configured refund window is fourteen days. A request after twenty days exceeds that window.' };
    repo.write('generated.json', JSON.stringify(input));
    expect(runCli(['--save-product', join(repo.path, 'generated.json'), '--repo', repo.path]).status).toBe(0);
    expect(check(repo.path).status).toBe('reusable');
    const saved = JSON.parse(readFileSync(join(repo.path, '.comprehension/cache/payments.json'), 'utf8'));
    expect(saved.quiz.questions[0].correctOptionIds).toEqual(['denied']);
  } finally { repo.dispose(); }
});
