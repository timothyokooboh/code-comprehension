import { reviewSessionSchema, reviewSnapshotSchema, reviewSubmissionSchema, reviewRetakeSchema, reviewTimings, type ReviewSession, type ReviewSnapshot, type ReviewSubmission, type ReviewRetake } from '@code-comprehension/quiz-contract';

const key = 'code-comprehension:current-review:v1';
export function createReviewStorage(revision: string | undefined) {
  function clear() { try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
  function read() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      const session = reviewSessionSchema.safeParse(value?.session);
      const pending = value?.pending ? reviewSubmissionSchema.parse(value.pending) : undefined;
      const retake = value?.retake ? reviewRetakeSchema.parse(value.retake) : undefined;
      const snapshot = value?.snapshot ? reviewSnapshotSchema.parse(value.snapshot) : null;
      if (!session.success || typeof value.expiresAt !== 'number' || value.expiresAt <= Date.now() || session.data.revision !== revision) { clear(); return null; }
      return { session: session.data, pending, retake, snapshot, expiresAt: value.expiresAt };
    } catch { clear(); return null; }
  }
  const saved = read();
  const expiresAt = saved?.expiresAt ?? Date.now() + reviewTimings.retentionMs;
  return {
    saved, clear,
    write(session: ReviewSession, pending: ReviewSubmission | undefined, snapshot: ReviewSnapshot | null, retake?: ReviewRetake) {
      try { sessionStorage.setItem(key, JSON.stringify({ expiresAt, session, pending, snapshot, retake })); return true; }
      catch { return false; }
    },
  };
}
