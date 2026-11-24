import { readRecovery } from './recovery.js';
import { readFile } from 'node:fs/promises';
import { reviewJobSchema, reviewJobStates, reviewSnapshotSchema, reviewPaths, reviewTimings, reviewErrors, runtimeLoopbackHost } from '@code-comprehension/quiz-contract';
import { ReviewError } from './state.js';

export async function requestReview(sessionFile: string, feedbackFile?: string, failure = false) {
  try {
    const session = readRecovery(sessionFile);
    const url = new URL(session.url);
    if (url.protocol !== 'http:' || url.hostname !== runtimeLoopbackHost || !url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || typeof session.token !== 'string') throw new ReviewError(reviewErrors.invalid);
    const body = feedbackFile ? await readFile(feedbackFile, 'utf8') : undefined;
    for (;;) {
      const response = await fetch(new URL(body ? failure ? reviewPaths.failure : reviewPaths.feedback : reviewPaths.wait, url), {
        method: body ? 'POST' : 'GET', redirect: 'error',
        headers: { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' },
        body, signal: AbortSignal.timeout(body ? reviewTimings.requestMs : reviewTimings.waitMs + reviewTimings.requestMs),
      });
      const data = await response.json();
      if (!response.ok) throw new ReviewError(Object.values(reviewErrors).includes(data.code) ? data.code : reviewErrors.unavailable, data.issues);
      const parsed = (body ? reviewSnapshotSchema : reviewJobSchema).safeParse(data);
      if (!parsed.success) throw new ReviewError(reviewErrors.invalid, parsed.error.issues);
      if (parsed.data.status !== reviewJobStates.timeout) return parsed.data;
    }
  } catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError(reviewErrors.unavailable);
  }
}
