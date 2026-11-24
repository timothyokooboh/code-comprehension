import { constants as httpStatus } from 'node:http2';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { reviewProtocolVersion, reviewErrors, reviewPaths, reviewLimits } from '@code-comprehension/quiz-contract';
import { sendJson } from '../assessment/http.js';
import { ReviewError, type WrittenReview } from './state.js';

async function readBody(request: IncomingMessage) {
  if (request.headers['content-type'] !== 'application/json') throw new ReviewError(reviewErrors.invalid);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > reviewLimits.requestBytes) throw new ReviewError(reviewErrors.invalid);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new ReviewError(reviewErrors.invalid); }
}
export async function handleReviewRequest(request: IncomingMessage, response: ServerResponse,
  review: WrittenReview, origin: string, tokens: { browser: string; reviewer: string }) {
  try {
    if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin)) throw new ReviewError(reviewErrors.forbidden);
    const path = request.url?.split('?')[0];
    if (path === reviewPaths.session && request.method === 'GET') {
      sendJson(response, { protocolVersion: reviewProtocolVersion, sessionId: review.sessionId, revision: review.revision(), token: tokens.browser });
      return;
    }
    const agent = path === reviewPaths.wait || path === reviewPaths.feedback;
    if (request.headers.authorization !== 'Bearer ' + (agent ? tokens.reviewer : tokens.browser)) throw new ReviewError(reviewErrors.forbidden);
    if (path === reviewPaths.state && request.method === 'GET') sendJson(response, review.snapshot());
    else if (path === reviewPaths.submit && request.method === 'POST') sendJson(response, review.submit(await readBody(request)));
    else if (path === reviewPaths.feedback && request.method === 'POST') sendJson(response, review.review(await readBody(request)));
    else if (path === reviewPaths.wait && request.method === 'GET') {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      response.once('close', cancel);
      try {
        const job = await review.wait(controller.signal);
        if (!response.destroyed) sendJson(response, job);
      } finally { response.removeListener('close', cancel); }
    } else response.writeHead(httpStatus.HTTP_STATUS_METHOD_NOT_ALLOWED).end();
  } catch (error) {
    const failure = error instanceof ReviewError ? error : new ReviewError(reviewErrors.invalid);
    sendJson(response, { code: failure.code, issues: failure.issues },
      failure.code === reviewErrors.forbidden ? httpStatus.HTTP_STATUS_FORBIDDEN : failure.code === reviewErrors.stale ? httpStatus.HTTP_STATUS_CONFLICT : httpStatus.HTTP_STATUS_BAD_REQUEST);
  }
}
