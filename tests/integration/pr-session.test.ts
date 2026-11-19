import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

test('prepares committed PR changes even with a clean working tree', () => {
  const repo = createRepository();
  try {
    repo.write('payment.ts', 'export const retries = 3;\n');
    repo.git('add', '.');
    repo.git('commit', '-m', 'retry payments');
    const response = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main']);
    expect(response.status, response.stderr).toBe(0);
    const session = JSON.parse(response.stdout);
    try {
      expect(session.comparison).toMatchObject({ baseline: repo.baseline, target: 'main', includesUncommitted: false });
      expect(readFileSync(session.diffPath, 'utf8')).toContain('+export const retries = 3;');
      expect(repo.git('status', '--porcelain')).toBe('');
    } finally {
      expect(runCli(['--discard-pr', session.directory]).status).toBe(0);
    }
  } finally { repo.dispose(); }
});

test('combines committed, staged, unstaged, and untracked work without changing the index', () => {
  const repo = createRepository();
  try {
    repo.write('payment.ts', 'export const retries = 1;\n');
    repo.git('add', '.'); repo.git('commit', '-m', 'first retry');
    repo.write('payment.ts', 'export const retries = 2;\n'); repo.git('add', '.');
    repo.write('payment.ts', 'export const retries = 3;\n');
    repo.write('new file.ts', 'export const timeout = 5000;\n');
    const index = repo.git('diff', '--cached');
    const result = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main']);
    expect(result.status, result.stderr).toBe(0);
    const session = JSON.parse(result.stdout);
    try {
      const diff = readFileSync(session.diffPath, 'utf8');
      expect(diff).toContain('-export const retries = 0;');
      expect(diff).toContain('+export const retries = 3;');
      expect(diff).not.toContain('+export const retries = 2;');
      expect(diff).toContain('+export const timeout = 5000;');
      expect(session.comparison.includesUncommitted).toBe(true);
      expect(session.comparison.files).toEqual(['payment.ts', 'new file.ts']);
      expect(repo.git('diff', '--cached')).toBe(index);
    } finally { runCli(['--discard-pr', session.directory]); }
  } finally { repo.dispose(); }
});

test('direct-to-target commits require an explicit baseline even when the remote target is behind', () => {
  const repo = createRepository();
  try {
    repo.git('switch', 'main');
    repo.git('update-ref', 'refs/remotes/origin/main', repo.baseline);
    repo.write('payment.ts', 'export const retries = 3;\n');
    repo.git('add', '.'); repo.git('commit', '-m', 'direct commit');
    const ambiguous = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'origin/main']);
    expect(ambiguous.status).toBe(1);
    expect(ambiguous.stderr).toContain('--baseline');
    const explicit = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'origin/main', '--baseline', repo.baseline]);
    expect(explicit.status, explicit.stderr).toBe(0);
    const session = JSON.parse(explicit.stdout);
    expect(session.comparison.baseline).toBe(repo.baseline);
    runCli(['--discard-pr', session.directory]);
  } finally { repo.dispose(); }
});


test('validates before launch, rejects stale scope, and cleans up after normal shutdown', async () => {
  const repo = createRepository();
  let directory: string | undefined;
  try {
    repo.write('payment.ts', 'export const retries = 3;\n');
    const prepared = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main', '--baseline', repo.baseline]);
    const session = JSON.parse(prepared.stdout);
    directory = session.directory;
    writeFileSync(session.quizPath, '{}');
    const invalid = runCli(['--validate-pr', session.directory]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('Quiz validation failed');
    expect(existsSync(session.directory)).toBe(true);
    const quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));
    quiz.type = 'pr';
    writeFileSync(session.quizPath, JSON.stringify(quiz));
    expect(runCli(['--validate-pr', session.directory]).status).toBe(0);
    repo.write('payment.ts', 'export const retries = 4;\n');
    const stale = runCli(['--pr-session', session.directory, '--no-open']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('changed since preparation');
    repo.write('payment.ts', 'export const retries = 3;\n');
    const app = await launchCli(['--pr-session', session.directory]);
    try {
      const served = await (await fetch(`${app.url}/api/quiz`)).json();
      expect(served.comparison).toMatchObject({ baseline: repo.baseline, includesUncommitted: true });
    } finally { await app.stop(); }
    expect(existsSync(session.directory)).toBe(false);
    expect(existsSync(`${repo.path}/.comprehension`)).toBe(false);
  } finally {
    if (directory && existsSync(directory)) runCli(['--discard-pr', directory]);
    repo.dispose();
  }
});

test('empty comparisons report no assessment and missing refs fail without starting a server', () => {
  const repo = createRepository();
  try {
    const empty = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main', '--baseline', repo.baseline]);
    expect(empty.status, empty.stderr).toBe(0);
    const result = JSON.parse(empty.stdout);
    expect(result.status).toBe('no_changes');
    expect(result.directory).toBeUndefined();
    const missing = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'missing-branch']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('Check the repository and refs');
    expect(missing.stdout).not.toContain('http://');
    expect(runCli(['--target', 'main']).status).toBe(1);
    expect(runCli(['--discard-pr', repo.path]).status).toBe(1);
    expect(existsSync(repo.path)).toBe(true);
  } finally { repo.dispose(); }
});

test('distinct branch names sharing a suffix use their merge base without clarification', () => {
  const repo = createRepository();
  try {
    repo.git('branch', 'release/feature', repo.baseline);
    repo.git('switch', '-c', 'feature');
    repo.write('payment.ts', 'export const retries = 5;\n');
    repo.git('add', '.'); repo.git('commit', '-m', 'feature change');
    const response = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'release/feature']);
    expect(response.status, response.stderr).toBe(0);
    const session = JSON.parse(response.stdout);
    expect(session.comparison.baseline).toBe(repo.baseline);
    runCli(['--discard-pr', session.directory]);
  } finally { repo.dispose(); }
});

test('unavailable temporary storage reports session-specific recovery guidance', () => {
  const repo = createRepository();
  try {
    repo.write('payment.ts', 'export const retries = 3;\n');
    const result = runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main', '--baseline', repo.baseline], {
      ...process.env, TMPDIR: `${repo.path}/unavailable`,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('temporary PR session');
    expect(result.stderr).not.toContain('selected port');
  } finally { repo.dispose(); }
});
