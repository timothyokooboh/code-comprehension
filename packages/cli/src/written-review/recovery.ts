import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { activeAssessmentSchema, reviewSubmissionSchema, reviewFeedbackSchema, reviewErrors, reviewTimings, runtimeLoopbackHost, validQuestionSelection } from '@code-comprehension/quiz-contract';
import { ReviewError, createWrittenReview } from './state.js';

const root = join(tmpdir(), `comprehension-sessions-${process.getuid?.() ?? 'local'}`);
const sessionName = 'session.json';
const lockName = 'runtime.lock';
const recoverySchema = z.strictObject({
  version: z.literal(1), sessionId: z.uuid(), expiresAt: z.number().int().positive(),
  url: z.string().url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'http:' && url.hostname === runtimeLoopbackHost && Boolean(url.port) &&
      url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash;
  }), token: z.string().min(1), browserToken: z.string().min(1),
  assessment: activeAssessmentSchema,
  submission: reviewSubmissionSchema.nullable(), feedback: reviewFeedbackSchema.nullable(), failed: z.boolean().default(false),
});
export type RecoveryData = z.infer<typeof recoverySchema>;

function privateDirectory(path: string) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const info = lstatSync(path);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 ||
    (process.getuid && info.uid !== process.getuid())) throw new ReviewError(reviewErrors.recovery);
}
function sessionDirectory(file: string) {
  const path = resolve(file);
  const directory = dirname(path);
  if (dirname(directory) !== root || path !== join(directory, sessionName)) throw new ReviewError(reviewErrors.recovery);
  privateDirectory(root);
  const info = lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) throw new ReviewError(reviewErrors.recovery);
  return directory;
}
function alive(pid: number) {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}
function acquire(directory: string) {
  const path = join(directory, lockName);
  try {
    const pid = Number(readFileSync(path, 'utf8'));
    if (!Number.isInteger(pid) || pid <= 0 || alive(pid)) throw new ReviewError(reviewErrors.active);
    rmSync(path);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  try { writeFileSync(path, String(process.pid), { flag: 'wx', mode: 0o600 }); }
  catch { throw new ReviewError(reviewErrors.active); }
}
export function readRecovery(file: string) {
  try {
    const directory = sessionDirectory(file);
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) throw new ReviewError(reviewErrors.recovery);
    const parsed = recoverySchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (!parsed.success) throw new ReviewError(reviewErrors.recovery);
    if (parsed.data.expiresAt <= Date.now()) {
      acquire(directory);
      rmSync(directory, { recursive: true, force: true });
      throw new ReviewError(reviewErrors.expired);
    }
    const { assessment, sessionId, submission, feedback } = parsed.data;
    if (assessment.quiz && assessment.quiz.runtimeRevision !== assessment.revision) throw new ReviewError(reviewErrors.recovery);
    if (assessment.displayed.length && (!assessment.quiz || !validQuestionSelection(assessment.quiz, assessment.displayed.map(item => item.id)))) throw new ReviewError(reviewErrors.recovery);
    try {
      const validator = createWrittenReview(() => assessment.quiz, { sessionId, submission: null, feedback: null });
      if (submission) validator.submit(submission);
      if (feedback) validator.review(feedback);
    } catch { throw new ReviewError(reviewErrors.recovery); }
    return parsed.data;
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.recovery);
  }
}
function sweepExpired() {
  privateDirectory(root);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !z.uuid().safeParse(entry.name).success) continue;
    const directory = join(root, entry.name);
    try { readRecovery(join(directory, sessionName)); } catch {
      // Corrupt/incomplete crash files also have a bounded lifetime.
      try {
        if (Date.now() - lstatSync(directory).mtimeMs >= reviewTimings.retentionMs) {
          acquire(directory);
          rmSync(directory, { recursive: true, force: true });
        }
      } catch { /* A live owner or concurrent cleanup keeps its files. */ }
    }
  }
}
export function openRecovery(file?: string) {
  const data = file ? readRecovery(file) : undefined;
  sweepExpired();
  const directory = file ? sessionDirectory(file) : join(root, randomUUID());
  privateDirectory(directory);
  acquire(directory);
  const path = join(directory, sessionName);
  return {
    path, data,
    sessionId: data?.sessionId ?? randomUUID(),
    expiresAt: data?.expiresAt ?? Date.now() + reviewTimings.retentionMs,
    tokens: { browser: data?.browserToken ?? randomBytes(32).toString('hex'), reviewer: data?.token ?? randomBytes(32).toString('hex') },
    save(value: RecoveryData) {
      try {
        const temporary = join(directory, 'session.next');
        writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
        renameSync(temporary, path);
      } catch { throw new ReviewError(reviewErrors.storage); }
    },
    release() { rmSync(join(directory, lockName), { force: true }); },
    remove() { rmSync(directory, { recursive: true, force: true }); },
  };
}
export function closeRecovery(file: string) {
  try {
    const directory = sessionDirectory(file);
    acquire(directory);
    rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.recovery);
  }
}
