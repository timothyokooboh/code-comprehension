import { discardPrSync } from '../pr/session.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { activeAssessmentSchema, reviewSubmissionSchema, reviewFeedbackSchema, reviewErrors, reviewTimings, runtimeLoopbackHost, validQuestionSelection, assessmentSourceKinds } from '@code-comprehension/quiz-contract';
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
  // Publish our unique claim before inspecting peers. Concurrent claimants either
  // observe one another and back off, or observe the already-established owner.
  // Never unlink another process's claim, including after a crash.
  const own = join(directory, `owner-${process.pid}-${randomUUID()}`);
  writeFileSync(own, '', { flag: 'wx', mode: 0o600 });
  try {
    for (const name of readdirSync(directory)) {
      if (join(directory, name) === own) continue;
      const match = /^owner-(\d+)-/.exec(name);
      if (match && alive(Number(match[1]))) throw new ReviewError(reviewErrors.active);
      // Recognise sessions created before unique ownership claims were introduced.
      if (name === lockName) {
        const pid = Number(readFileSync(join(directory, name), 'utf8'));
        if (!Number.isInteger(pid) || pid <= 0 || alive(pid)) throw new ReviewError(reviewErrors.active);
      }
    }
  } catch (error) { rmSync(own, { force: true }); throw error; }
  return () => rmSync(own, { force: true });
}
export function readRecovery(file: string) {
  try {
    const directory = sessionDirectory(file);
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) throw new ReviewError(reviewErrors.recovery);
    const parsed = recoverySchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (!parsed.success) throw new ReviewError(reviewErrors.recovery);
    if (parsed.data.expiresAt <= Date.now()) throw new ReviewError(reviewErrors.expired);
    const { assessment, sessionId, submission, feedback } = parsed.data;
    if (assessment.quiz && assessment.quiz.runtimeRevision !== assessment.revision) throw new ReviewError(reviewErrors.recovery);
    if (assessment.displayed.length && (!assessment.quiz || !validQuestionSelection(assessment.quiz, assessment.displayed.map(item => item.id)))) throw new ReviewError(reviewErrors.recovery);
    try {
      const validator = createWrittenReview(() => assessment.quiz, { sessionId, submission: null, feedback: null });
      if (submission) validator.submit(submission);
      if (feedback) validator.validateFeedback(feedback);
    } catch { throw new ReviewError(reviewErrors.recovery); }
    return parsed.data;
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.recovery);
  }
}
function removeSession(directory: string) {
  let source: RecoveryData['assessment']['source'] | undefined;
  try {
    const parsed = recoverySchema.safeParse(JSON.parse(readFileSync(join(directory, sessionName), 'utf8')));
    if (parsed.success) source = parsed.data.assessment.source;
  } catch { /* Corrupt records cannot safely identify external PR artifacts. */ }
  try { if (source?.kind === assessmentSourceKinds.pr) discardPrSync(source.directory); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}
function sweepExpired() {
  privateDirectory(root);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !z.uuid().safeParse(entry.name).success) continue;
    const directory = join(root, entry.name);
    try { readRecovery(join(directory, sessionName)); } catch (error) {
      // Corrupt/incomplete crash files also have a bounded lifetime.
      try {
        if (error instanceof ReviewError && error.code === reviewErrors.expired || Date.now() - lstatSync(directory).mtimeMs >= reviewTimings.retentionMs) {
          acquire(directory);
          removeSession(directory);
        }
      } catch { /* A live owner or concurrent cleanup keeps its files. */ }
    }
  }
}
export function openRecovery(file?: string) {
  try {
    privateDirectory(root);
    const directory = file ? sessionDirectory(file) : join(root, randomUUID());
    if (!file) privateDirectory(directory);
    const release = acquire(directory);
    let data: RecoveryData | undefined;
    try {
      // Read only after ownership: a prior runtime may have saved newer feedback
      // between the caller deciding to resume and our acquisition.
      data = file ? readRecovery(file) : undefined;
      sweepExpired();
    } catch (error) {
      try { if (error instanceof ReviewError && error.code === reviewErrors.expired) removeSession(directory); }
      finally { release(); }
      throw error;
    }
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
      release,
      remove() { removeSession(directory); },
    };
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.recovery);
  }
}

export function closeRecovery(file: string) {
  try {
    const directory = sessionDirectory(file);
    acquire(directory);
    removeSession(directory);
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.recovery);
  }
}
