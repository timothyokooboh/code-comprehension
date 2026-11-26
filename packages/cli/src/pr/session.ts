import { readFileSync, realpathSync, lstatSync, rmSync, existsSync } from 'node:fs';
import { mkdtemp, writeFile, realpath, rm } from 'node:fs/promises';
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
const explainerName = 'explainer.json';
const manifestSchema = z.strictObject({
  capturedAt: z.iso.datetime().optional(),
  version: z.literal(sessionVersion), repo: z.string().min(1), baselineOverride: z.string().optional(),
  comparison: prComparisonSchema, fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function preparePr(repo: string, target: string, baseline?: string) {
  const snapshot = await captureComparison(repo, target, baseline);
  if (!snapshot.diff) return { status: prSessionStatuses.noChanges, comparison: snapshot.comparison };
  const capturedAt = new Date().toISOString();
  const sourceSnapshot = { revision: snapshot.comparison.head, capturedAt, includesUncommitted: snapshot.comparison.includesUncommitted };
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(await realpath(tmpdir()), sessionPrefix));
    await writeFile(join(directory, manifestName), JSON.stringify({
      capturedAt, version: sessionVersion, repo: snapshot.root, baselineOverride: baseline,
      comparison: snapshot.comparison, fingerprint: snapshot.fingerprint,
    }), { mode: 0o600 });
    await writeFile(join(directory, diffName), snapshot.diff, { mode: 0o600 });
    return { status: prSessionStatuses.prepared, directory, diffPath: join(directory, diffName), quizPath: join(directory, quizName), explainerPath: join(directory, explainerName), snapshot: sourceSnapshot, comparison: snapshot.comparison };
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

function readSessionSync(path: string) {
  try {
    const directory = resolve(path);
    if (!lstatSync(directory).isDirectory() || dirname(directory) !== realpathSync(tmpdir()) ||
      !basename(directory).startsWith(sessionPrefix)) throw new Error();
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(directory, manifestName), 'utf8')));
    return { directory, manifest, quizPath: join(directory, quizName), explainerPath: join(directory, explainerName) };
  } catch (cause) { throw new CliError(cliErrorCodes.sessionInvalid, { cause }); }
}

export async function discardPr(path: string) {
  const { directory } = await readSession(path);
  try { await rm(directory, { recursive: true, force: true }); }
  catch (cause) { throw new CliError(cliErrorCodes.sessionCleanupFailed, { cause }); }
}

export async function readSession(path: string) { return readSessionSync(path); }

export function discardPrSync(path: string) {
  if (!existsSync(path)) return;
  const { directory } = readSessionSync(path);
  try { rmSync(directory, { recursive: true, force: true }); }
  catch (cause) { throw new CliError(cliErrorCodes.sessionCleanupFailed, { cause }); }
}
