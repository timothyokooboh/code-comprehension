import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import type { PrComparison } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';

const execute = promisify(execFile);
const gitTimeoutMs = 15_000;
const maximumDiffBytes = 16 * 1024 * 1024;

async function git(repo: string, args: string[], allowedExitCode?: number) {
  try {
    return (await execute('git', ['-C', repo, ...args], {
      encoding: 'utf8', timeout: gitTimeoutMs, maxBuffer: maximumDiffBytes,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
    })).stdout;
  } catch (cause) {
    if (allowedExitCode !== undefined && typeof cause === 'object' && cause !== null &&
      'code' in cause && cause.code === allowedExitCode && 'stdout' in cause && typeof cause.stdout === 'string') return cause.stdout;
    throw new CliError(cliErrorCodes.gitFailed, { cause });
  }
}

const splitPaths = (output: string) => output.split('\0').filter(Boolean);
const commit = async (repo: string, ref: string) => (await git(repo, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])).trim();

async function isTargetBranch(repo: string, target: string) {
  const branchRef = (await git(repo, ['symbolic-ref', '--quiet', 'HEAD'], 1)).trim();
  const targetRef = (await git(repo, ['rev-parse', '--symbolic-full-name', '--verify', '--end-of-options', target])).trim();
  if (!branchRef) return false;
  if (targetRef.startsWith('refs/heads/')) return targetRef === branchRef;
  const remotePrefix = 'refs/remotes/';
  if (!targetRef.startsWith(remotePrefix)) return false;
  const remotePath = targetRef.slice(remotePrefix.length);
  const remotes = (await git(repo, ['remote'])).trim().split('\n').filter(Boolean);
  const remote = remotes.sort((a, b) => b.length - a.length).find((name) => remotePath.startsWith(`${name}/`));
  const branch = remote ? remotePath.slice(remote.length + 1) : remotePath.slice(remotePath.indexOf('/') + 1);
  return branchRef === `refs/heads/${branch}`;
}

export async function captureComparison(repo: string, target: string, explicitBaseline?: string) {
  const root = (await git(repo, ['rev-parse', '--show-toplevel'])).trim();
  const head = await commit(root, 'HEAD');
  const targetCommit = await commit(root, target);
  const onTargetBranch = await isTargetBranch(root, target);
  if (!explicitBaseline && (head === targetCommit || onTargetBranch)) throw new CliError(cliErrorCodes.baselineRequired);
  const baseline = explicitBaseline ? await commit(root, explicitBaseline)
    : (await git(root, ['merge-base', head, targetCommit])).trim();
  if (await git(root, ['ls-files', '--unmerged', '-z'])) throw new CliError(cliErrorCodes.gitFailed);
  let diff = await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--binary', baseline, '--']);
  const tracked = splitPaths(await git(root, ['diff', '--name-only', '-z', baseline, '--']));
  const untracked = splitPaths(await git(root, ['ls-files', '--others', '--exclude-standard', '-z']));
  for (const path of untracked) {
    diff += await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--binary', '--no-index', '--', '/dev/null', path], 1);
  }
  const comparison: PrComparison = {
    target, baseline, head,
    includesUncommitted: (await git(root, ['status', '--porcelain', '-z', '--untracked-files=all'])).length > 0,
    files: [...tracked, ...untracked],
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(comparison)).update(diff).digest('hex');
  return { root, comparison, diff, fingerprint };
}
