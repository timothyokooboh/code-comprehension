import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { quizSchema } from '../../packages/quiz-contract/src/quiz.js';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

const fixture = quizSchema.parse(JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8')));

test('combines independently valid banks with stable identities and removes duplicate questions', async () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    for (const id of ['payments', 'cart']) {
      repo.write(`${id}.ts`, 'export const enabled = true;');
      const questions = fixture.questions.map((question, index) => ({
        ...question, prompt: index === 0 ? `${id}: ${question.prompt}` : question.prompt,
        references: [{ path: `${id}.ts` }],
      }));
      repo.write('bank.json', JSON.stringify({ version: 1, id,
        scope: { kind: 'module', name: id, description: id, sourcePatterns: [`${id}.ts`], supportingFiles: [] },
        quiz: { ...fixture, type: 'product', questions },
      }));
      expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    }
    const app = await launchCli(['--product-bank', 'payments', 'cart', 'payments', '--repo', repo.path]);
    let first: ReturnType<typeof quizSchema.parse>;
    try {
      first = quizSchema.parse(await (await fetch(`${app.url}/api/quiz`)).json());
      expect(first.scope).toEqual(['cart', 'payments']);
      expect(first.questions).toHaveLength(3);
      expect(first.questions.find(({ prompt }) => prompt === fixture.questions[1]!.prompt)?.references)
        .toEqual([{ path: 'cart.ts' }, { path: 'payments.ts' }]);
      expect(new Set(first.questions.map((q) => q.id)).size).toBe(3);
      expect(first.selectionGroups).toHaveLength(2);
      expect(first.selectionGroups!.map((group: string[]) => group.length)).toEqual([2, 2]);
    } finally { await app.stop(); }
    const reversed = await launchCli(['--product-bank', 'cart', 'payments', '--repo', repo.path]);
    try { expect(await (await fetch(`${reversed.url}/api/quiz`)).json()).toEqual(first); }
    finally { await reversed.stop(); }
  } finally { repo.dispose(); }
});

test('mixed cache outcomes block composition without replacing unaffected module banks', async () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    repo.write('cart.ts', 'export const total = 10;');
    repo.write('checkout.ts', 'export const order = "cart-then-payment";');
    for (const [id, source, supportingFiles] of [
      ['payments', 'payment.ts', []], ['cart', 'cart.ts', []],
      ['checkout', 'checkout.ts', ['cart.ts', 'payment.ts']],
    ] as const) {
      repo.write(`${id}.json`, JSON.stringify({ version: 1, id,
        scope: { kind: 'module', name: id, description: id, sourcePatterns: [source], supportingFiles },
        quiz: { ...fixture, type: 'product', questions: fixture.questions.map((question) => ({ ...question, references: [{ path: source }] })) },
      }));
      expect(runCli(['--save-product', join(repo.path, `${id}.json`), '--repo', repo.path]).status).toBe(0);
    }
    const saved = (id: string) => readFileSync(join(repo.path, `.comprehension/cache/${id}.json`), 'utf8');
    const paymentBank = saved('payments');
    const cartBank = saved('cart');
    const check = (id: string) => JSON.parse(runCli(['--check-product', id, '--repo', repo.path]).stdout);
    repo.write('cart.ts', 'export const total = 20;');
    expect(check('payments').status).toBe('reusable');
    expect(check('cart').status).toBe('review_required');
    expect(check('checkout')).toMatchObject({ status: 'review_required', changedFiles: ['cart.ts'] });
    expect(check('missing').status).toBe('generation_required');
    expect(runCli(['--product-bank', 'payments', 'cart', '--repo', repo.path]).status).toBe(1);
    expect(runCli(['--product-bank', 'payments', 'missing', '--repo', repo.path]).status).toBe(1);
    expect(saved('payments')).toBe(paymentBank);
    expect(saved('cart')).toBe(cartBank);
    // Regenerate only the affected banks; the reusable bank remains untouched.
    for (const id of ['cart', 'checkout']) {
      expect(runCli(['--save-product', join(repo.path, `${id}.json`), '--repo', repo.path]).status).toBe(0);
    }
    const app = await launchCli(['--product-bank', 'payments', 'cart', 'checkout', '--repo', repo.path]);
    try { expect((await (await fetch(`${app.url}/api/quiz`)).json()).scope).toEqual(['cart', 'checkout', 'payments']); }
    finally { await app.stop(); }
    expect(saved('payments')).toBe(paymentBank);
  } finally { repo.dispose(); }
});

test('general overview remains an alternative to combining module banks', () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    for (const kind of ['general', 'module']) {
      repo.write('bank.json', JSON.stringify({ version: 1, id: kind,
        scope: { kind, name: kind, description: kind, sourcePatterns: ['payment.ts'], supportingFiles: [] },
        quiz: { ...fixture, type: 'product', questions: fixture.questions.map((question) => ({ ...question, references: [{ path: 'payment.ts' }] })) },
      }));
      expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    }
    const rejected = runCli(['--product-bank', 'general', 'module', '--repo', repo.path]);
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain('general overview bank on its own');
  } finally { repo.dispose(); }
});
