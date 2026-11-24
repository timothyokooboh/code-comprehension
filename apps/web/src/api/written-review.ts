import { reviewErrors, reviewPaths, reviewTimings, reviewSessionSchema, reviewSnapshotSchema,
  type ReviewSession, type ReviewSubmission, type ReviewRetake, type ReviewErrorCode } from '@code-comprehension/quiz-contract';

export class ReviewRequestError extends Error {
  constructor(public code: ReviewErrorCode) { super(code); }
}
async function request(path: string, signal: AbortSignal, token?: string, body?: unknown) {
  try {
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.any([signal, AbortSignal.timeout(reviewTimings.requestMs)]),
    });
    const data = await response.json();
    if (!response.ok) throw new ReviewRequestError(Object.values(reviewErrors).includes(data.code) ? data.code : reviewErrors.unavailable);
    return data;
  } catch (error) {
    if (error instanceof ReviewRequestError) throw error;
    throw new ReviewRequestError(reviewErrors.unavailable);
  }
}
export async function loadReviewSession(signal: AbortSignal) {
  const parsed = reviewSessionSchema.safeParse(await request(reviewPaths.session, signal));
  if (!parsed.success) throw new ReviewRequestError(reviewErrors.invalid);
  return parsed.data;
}
export async function loadReview(session: ReviewSession, signal: AbortSignal, submission?: ReviewSubmission) {
  const data = await request(submission ? reviewPaths.submit : reviewPaths.state, signal, session.token, submission);
  const parsed = reviewSnapshotSchema.safeParse(data);
  if (!parsed.success) throw new ReviewRequestError(reviewErrors.invalid);
  return parsed.data;
}

export async function retakeReview(session: ReviewSession, signal: AbortSignal, retake: ReviewRetake) {
  const parsed = reviewSnapshotSchema.safeParse(await request(reviewPaths.retake, signal, session.token, retake));
  if (!parsed.success) throw new ReviewRequestError(reviewErrors.invalid);
  return parsed.data;
}
