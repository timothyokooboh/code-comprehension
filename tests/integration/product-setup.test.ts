import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createRepository } from '../support/repository.js';
import { runCli } from '../support/cli.js';

test('product setup is requested once and remains isolated to its project', () => {
  const first = createRepository();
  const second = createRepository();
  try {
    const status = runCli(['--product-status', '--repo', first.path]);
    expect(status.status, status.stderr).toBe(0);
    expect(JSON.parse(status.stdout).status).toBe('setup_required');
    expect(existsSync(join(first.path, '.comprehension'))).toBe(false);
    const setup = runCli(['--configure-product', 'git', '--repo', first.path]);
    expect(setup.status, setup.stderr).toBe(0);
    const later = JSON.parse(runCli(['--product-status', '--repo', first.path]).stdout);
    expect(later).toMatchObject({ status: 'ready', config: { bankTracking: 'git' }, conflicts: [] });
    expect(JSON.parse(readFileSync(join(first.path, '.comprehension/config.json'), 'utf8')).bankTracking).toBe('git');
    expect(JSON.parse(runCli(['--product-status', '--repo', second.path]).stdout).status).toBe('setup_required');
  } finally { first.dispose(); second.dispose(); }
});

test('local banks are ignored, preference changes remove only managed rules, and conflicts are reported', () => {
  const repo = createRepository();
  try {
    repo.write('.gitignore', 'node_modules/\n# keep this comment\n');
    const local = runCli(['--configure-product', 'local', '--repo', repo.path]);
    expect(local.status, local.stderr).toBe(0);
    expect(repo.git('check-ignore', '.comprehension/cache/payments.json')).toBe('.comprehension/cache/payments.json');
    expect(repo.git('status', '--porcelain', '--untracked-files=all')).toContain('.comprehension/config.json');
    expect(JSON.parse(runCli(['--product-status', '--repo', repo.path]).stdout).config.bankTracking).toBe('local');
    const tracked = runCli(['--configure-product', 'git', '--repo', repo.path]);
    expect(tracked.status, tracked.stderr).toBe(0);
    expect(readFileSync(join(repo.path, '.gitignore'), 'utf8')).toBe('node_modules/\n# keep this comment\n');
    repo.write('.gitignore', 'node_modules/\n.comprehension/\n');
    const conflicts = JSON.parse(runCli(['--product-status', '--repo', repo.path]).stdout).conflicts;
    expect(conflicts.map((item: { code: string }) => item.code)).toEqual(['config_ignored', 'cache_ignored']);
    expect(conflicts[1].rule).toContain('.comprehension/');
    expect(readFileSync(join(repo.path, '.gitignore'), 'utf8')).toBe('node_modules/\n.comprehension/\n');
  } finally { repo.dispose(); }
});

test('manual preference edits reconcile managed rules and malformed config is preserved for repair', () => {
  const repo = createRepository();
  try {
    expect(runCli(['--configure-product', 'git', '--repo', repo.path]).status).toBe(0);
    repo.write('.comprehension/config.json', JSON.stringify({ version: 1, bankTracking: 'local' }));
    const local = runCli(['--product-status', '--repo', repo.path]);
    expect(local.status, local.stderr).toBe(0);
    expect(repo.git('check-ignore', '.comprehension/cache/a.json')).toBe('.comprehension/cache/a.json');
    repo.write('.comprehension/config.json', JSON.stringify({ version: 1, bankTracking: 'git' }));
    expect(runCli(['--product-status', '--repo', repo.path]).status).toBe(0);
    expect(readFileSync(join(repo.path, '.gitignore'), 'utf8')).toBe('');
    repo.write('.comprehension/config.json', '{broken');
    const invalid = runCli(['--product-status', '--repo', repo.path]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('configuration');
    expect(readFileSync(join(repo.path, '.comprehension/config.json'), 'utf8')).toBe('{broken');
  } finally { repo.dispose(); }
});

test('reconciles a managed ignore block after CRLF conversion without duplicating it', () => {
  const repo = createRepository();
  try {
    repo.write('.gitignore', 'node_modules/\n# keep me\n');
    expect(runCli(['--configure-product', 'local', '--repo', repo.path]).status).toBe(0);
    const converted = readFileSync(join(repo.path, '.gitignore'), 'utf8').replace(/\n/g, '\r\n');
    repo.write('.gitignore', converted);
    expect(runCli(['--product-status', '--repo', repo.path]).status).toBe(0);
    expect(readFileSync(join(repo.path, '.gitignore'), 'utf8').match(/# code-comprehension managed cache/g)).toHaveLength(1);
    const tracked = runCli(['--configure-product', 'git', '--repo', repo.path]);
    expect(tracked.status, tracked.stderr).toBe(0);
    expect(JSON.parse(tracked.stdout).conflicts).toEqual([]);
    expect(readFileSync(join(repo.path, '.gitignore'), 'utf8')).toBe('node_modules/\r\n# keep me\r\n');
  } finally { repo.dispose(); }
});
