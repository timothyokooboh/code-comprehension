import { mkdtemp, writeFile, readFile, realpath, lstat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { z } from 'zod';
import { prComparisonSchema, prSessionStatuses } from '@code-comprehension/quiz-contract';
import { captureComparison } from './comparison.js';
import { CliError, cliErrorCodes } from '../errors.js';

const sessionVersion = 1;
const sessionPrefix = 'code-comprehension-pr-';
const manifestName = 'session.json';
const diffName = 'changes.diff';
const quizName = 'quiz.json';
const manifestSchema = z.strictObject({
  version: z.literal(sessionVersion), repo: z.string().min(1), baselineOverride: z.string().optional(),
  comparison: prComparisonSchema, fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function preparePr(repo: string, target: string, baseline?: string) {
  const snapshot = await captureComparison(repo, target, baseline);
  if (!snapshot.diff) return { status: prSessionStatuses.noChanges, comparison: snapshot.comparison };
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(await realpath(tmpdir()), sessionPrefix));
    await writeFile(join(directory, manifestName), JSON.stringify({
      version: sessionVersion, repo: snapshot.root, baselineOverride: baseline,
      comparison: snapshot.comparison, fingerprint: snapshot.fingerprint,
    }), { mode: 0o600 });
    await writeFile(join(directory, diffName), snapshot.diff, { mode: 0o600 });
    return { status: prSessionStatuses.prepared, directory, diffPath: join(directory, diffName), quizPath: join(directory, quizName), comparison: snapshot.comparison };
  } catch (cause) {
    if (directory) {
      try { await rm(directory, { recursive: true, force: true }); }
      catch (cleanupCause) {
        throw new CliError(cliErrorCodes.sessionWriteFailed, { cause: new AggregateError([cause, cleanupCause]) });
      }
    }
    throw new CliError(cliErrorCodes.sessionWriteFailed, { cause });
  }
}

export async function readSession(path: string) {
  try {
    const directory = resolve(path);
    if (!(await lstat(directory)).isDirectory() || dirname(directory) !== await realpath(tmpdir()) ||
      !basename(directory).startsWith(sessionPrefix)) throw new Error();
    const manifest = manifestSchema.parse(JSON.parse(await readFile(join(directory, manifestName), 'utf8')));
    return { directory, manifest, quizPath: join(directory, quizName) };
  } catch (cause) { throw new CliError(cliErrorCodes.sessionInvalid, { cause }); }
}

export async function discardPr(path: string) {
  const { directory } = await readSession(path);
  try { await rm(directory, { recursive: true, force: true }); }
  catch (cause) { throw new CliError(cliErrorCodes.sessionCleanupFailed, { cause }); }
}
