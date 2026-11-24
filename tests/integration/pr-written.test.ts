import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRepository } from '../support/repository.js';
import { launchCli, runCli } from '../support/cli.js';

test('the PR workflow validates and launches generated written questions without product setup', async () => {
  const repo = createRepository();
  try {
    repo.write('payment.ts', 'export const retries = 2;\n');
    repo.git('add', 'payment.ts');
    repo.git('commit', '-m', 'change retries');
    const prepared = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main']);
    expect(prepared.status, prepared.stderr).toBe(0);
    const session = JSON.parse(prepared.stdout);
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/mixed-quiz.json', import.meta.url), 'utf8'));
    const quiz = { ...fixture, type: 'pr', questions: fixture.questions.map((question: object) => ({ ...question, references: [{ path: 'payment.ts' }] })) };
    const { writeFileSync } = await import('node:fs');
    writeFileSync(session.quizPath, JSON.stringify(quiz));
    const validated = runCli(['--validate-pr', session.directory]);
    expect(validated.status, validated.stderr).toBe(0);
    const app = await launchCli(['--pr-session', session.directory]);
    try {
      const served = await (await fetch(app.url + '/api/quiz')).json();
      expect(served.schemaVersion).toBe(2);
      expect(served.questions.filter((question: { type: string }) => question.type === 'written')).toHaveLength(1);
      expect(app.reviewSession).toBeTruthy();
    } finally { await app.stop(); }
    expect(runCli(['--product-status', '--repo', repo.path]).stdout).toContain('setup_required');
  } finally { repo.dispose(); }
});

test('discarding an interrupted PR review removes its comparison and quiz files', async () => {
  const repo = createRepository();
  try {
    repo.write('payment.ts', 'export const retries = 2;\n');
    repo.git('add', 'payment.ts');
    repo.git('commit', '-m', 'change retries');
    const prepared = JSON.parse(runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main']).stdout);
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/mixed-quiz.json', import.meta.url), 'utf8'));
    const { writeFileSync, existsSync } = await import('node:fs');
    writeFileSync(prepared.quizPath, JSON.stringify({ ...fixture, type: 'pr', questions: fixture.questions.map((q: object) => ({ ...q, references: [{ path: 'payment.ts' }] })) }));
    const app = await launchCli(['--pr-session', prepared.directory]);
    await app.stop('SIGKILL');
    expect(existsSync(prepared.diffPath)).toBe(true);
    const closed = runCli(['--close-review', app.reviewSession!]);
    expect(closed.status, closed.stderr).toBe(0);
    expect(existsSync(prepared.directory)).toBe(false);
    expect(existsSync(app.reviewSession!)).toBe(false);
  } finally { repo.dispose(); }
});
