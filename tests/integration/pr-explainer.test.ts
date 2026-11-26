import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli, launchCli } from '../support/cli.js';

const example = JSON.parse(
  readFileSync(new URL('../fixtures/explainer.json', import.meta.url), 'utf8'),
);

test('a PR explainer repairs invalid content, launches committed evidence, and cleans up without product setup', async () => {
  const repo = createRepository();
  let directory: string | undefined;
  try {
    repo.write('payment.ts', 'export const retries = 3;\n');
    repo.git('add', '.');
    repo.git('commit', '-m', 'retry payments');
    const prepared = runCli([
      '--prepare-pr',
      '--repo',
      repo.path,
      '--target',
      'main',
    ]);
    expect(prepared.status, prepared.stderr).toBe(0);
    const session = JSON.parse(prepared.stdout);
    directory = session.directory;
    expect(session.explainerPath).toEqual(expect.any(String));
    writeFileSync(session.explainerPath, '{}');
    const invalid = runCli(['--validate-pr-explainer', directory!]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('scenes');
    expect(existsSync(directory!)).toBe(true);
    const content = {
      ...example,
      type: 'pr',
      comparison: session.comparison,
      snapshot: session.snapshot,
    };
    writeFileSync(session.explainerPath, JSON.stringify(content));
    const valid = runCli(['--validate-pr-explainer', directory!]);
    expect(valid.status, valid.stderr).toBe(0);
    const app = await launchCli(['--pr-explainer', directory!]);
    try {
      const served = await (await fetch(`${app.url}/api/explainer`)).json();
      expect(served.comparison).toMatchObject({
        baseline: repo.baseline,
        includesUncommitted: false,
      });
      expect(served.snapshot).toEqual(session.snapshot);
      expect((await fetch(`${app.url}/explainer`)).status).toBe(200);
    } finally {
      await app.stop();
    }
    expect(existsSync(directory!)).toBe(false);
    expect(existsSync(`${repo.path}/.comprehension`)).toBe(false);
  } finally {
    if (directory && existsSync(directory)) runCli(['--discard-pr', directory]);
    repo.dispose();
  }
});

test('mixed final-state evidence rejects forged metadata and stale code before launch', () => {
  const repo = createRepository();
  let directory: string | undefined;
  try {
    repo.write('payment.ts', 'export const retries = 1;\n');
    repo.git('add', '.');
    repo.git('commit', '-m', 'one retry');
    repo.write('payment.ts', 'export const retries = 2;\n');
    repo.git('add', '.');
    repo.write('payment.ts', 'export const retries = 3;\n');
    const index = repo.git('diff', '--cached');
    const prepared = JSON.parse(
      runCli(['--prepare-pr', '--repo', repo.path, '--target', 'main']).stdout,
    );
    directory = prepared.directory;
    expect(readFileSync(prepared.diffPath, 'utf8')).toContain(
      '+export const retries = 3;',
    );
    const content = {
      ...example,
      type: 'pr',
      comparison: prepared.comparison,
      snapshot: prepared.snapshot,
    };
    writeFileSync(
      prepared.explainerPath,
      JSON.stringify({
        ...content,
        comparison: { ...content.comparison, target: 'pretend-target' },
      }),
    );
    expect(runCli(['--validate-pr-explainer', directory!]).stderr).toContain(
      'comparison',
    );
    writeFileSync(prepared.explainerPath, JSON.stringify(content));
    expect(runCli(['--validate-pr-explainer', directory!]).status).toBe(0);
    repo.write('payment.ts', 'export const retries = 4;\n');
    const stale = runCli(['--pr-explainer', directory!, '--no-open']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('changed since preparation');
    expect(stale.stdout).not.toContain('http://');
    expect(repo.git('diff', '--cached')).toBe(index);
  } finally {
    if (directory) runCli(['--discard-pr', directory]);
    repo.dispose();
  }
});
