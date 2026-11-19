import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function createRepository() {
  const path = mkdtempSync(join(tmpdir(), 'comprehension-git-test-'));
  const git = (...args: string[]) => execFileSync('git', ['-C', path, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Quiz test');
  git('config', 'user.email', 'quiz@example.invalid');
  const write = (name: string, content: string) => writeFileSync(join(path, name), content);
  write('payment.ts', 'export const retries = 0;\n');
  git('add', '.');
  git('commit', '-m', 'initial');
  const baseline = git('rev-parse', 'HEAD');
  git('switch', '-c', 'feat/retries');
  return { path, git, write, baseline, dispose: () => rmSync(path, { recursive: true, force: true }) };
}
