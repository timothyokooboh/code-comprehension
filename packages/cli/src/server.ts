import { ReviewError } from './written-review/state.js';
import { createReviewSession } from './written-review/session.js';
import { reviewPaths, reviewErrors } from '@code-comprehension/quiz-contract';
import { handleReviewRequest } from './written-review/http.js';
import { createServer } from 'node:http';
import { constants as httpStatus } from 'node:http2';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { explainerPath, explainerRoute, type Explainer, applicationName, runtimeStatusPath, runtimeReadyStatus, type RuntimeStatus, quizPath, type Quiz, type AssessmentSource, assessmentPaths, assessmentSourceKinds, runtimeLoopbackHost } from '@code-comprehension/quiz-contract';
import { loadAssets } from './assets.js';
import { startDevelopmentUi } from './development-ui.js';
import { CliError, cliErrorCodes } from './errors.js';
import { messages } from './locales/en.js';

import { handleAssessmentRequest, sendJson } from './assessment/http.js';

export async function startServer(port: number, quiz: Quiz | null = null, source: AssessmentSource = { kind: assessmentSourceKinds.file }, resumeFile?: string, devUi?: string, explainer: Explainer | null = null, onClose: () => Promise<void> = async () => {}) {
  const assets = devUi ? null : await loadAssets(fileURLToPath(new URL('./web/', import.meta.url)));
  let developmentUi: Awaited<ReturnType<typeof startDevelopmentUi>> | undefined;
  const status: RuntimeStatus = { name: applicationName, status: runtimeReadyStatus };
  const session = createReviewSession(quiz, source, resumeFile);
  const { state, review, tokens } = session;
  const server = createServer((request, response) => {
    if (Date.now() >= session.expiresAt) {
      sendJson(response, { code: reviewErrors.expired }, httpStatus.HTTP_STATUS_GONE);
      response.once('finish', () => { void close().catch(reportCloseFailure); });
      return;
    }
    const pathname = (request.url ?? '/').split('?')[0];
    if (pathname === explainerPath) {
      const address = server.address();
      const origin = address && typeof address !== 'string' ? `http://${runtimeLoopbackHost}:${address.port}` : null;
      if (`http://${request.headers.host}` !== origin || (request.headers.origin && request.headers.origin !== origin)) {
        response.writeHead(httpStatus.HTTP_STATUS_FORBIDDEN).end();
      } else if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(httpStatus.HTTP_STATUS_METHOD_NOT_ALLOWED).end();
      } else sendJson(response, explainer, httpStatus.HTTP_STATUS_OK, request.method === 'HEAD');
      return;
    }
    if (explainer && [...Object.values(reviewPaths), ...Object.values(assessmentPaths)].some(path => path === pathname)) {
      response.writeHead(httpStatus.HTTP_STATUS_NOT_FOUND).end();
      return;
    }
    if (Object.values(reviewPaths).some(path => path === pathname)) {
      const address = server.address();
      if (address && typeof address !== 'string') void handleReviewRequest(request, response, review, `http://${runtimeLoopbackHost}:${address.port}`, tokens);
      return;
    }
    if (Object.values(assessmentPaths).some((path) => path === pathname)) {
      const address = server.address();
      if (address && typeof address !== 'string') void handleAssessmentRequest(request, response, state, `http://${runtimeLoopbackHost}:${address.port}`);
      else response.writeHead(httpStatus.HTTP_STATUS_SERVICE_UNAVAILABLE).end();
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(httpStatus.HTTP_STATUS_METHOD_NOT_ALLOWED, { Allow: 'GET, HEAD' }).end();
      return;
    }
    if (pathname === runtimeStatusPath || pathname === quizPath) {
      response.writeHead(httpStatus.HTTP_STATUS_OK, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify(pathname === quizPath ? state.snapshot().quiz : status));
      return;
    }
    if (developmentUi) {
      developmentUi.middlewares(request, response, () => {
        response.writeHead(httpStatus.HTTP_STATUS_NOT_FOUND).end(messages.notFound);
      });
      return;
    }
    const asset = assets?.get(pathname === explainerRoute ? '/' : pathname ?? '/');
    if (!asset) {
      response.writeHead(httpStatus.HTTP_STATUS_NOT_FOUND).end(messages.notFound);
      return;
    }
    response.writeHead(httpStatus.HTTP_STATUS_OK, { 'Content-Type': asset.contentType, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : asset.body);
  });

  try {
    if (devUi) developmentUi = await startDevelopmentUi(devUi, server);
    server.listen(session.port ?? port, runtimeLoopbackHost);
    await once(server, 'listening');
  } catch (error) {
    await developmentUi?.close();
    session.release();
    if (!resumeFile) session.remove();
    if (error instanceof CliError) throw error;
    if (resumeFile) throw new ReviewError(reviewErrors.address);
    throw error;
  }
  const address = server.address();
  if (!address || typeof address === 'string') throw new CliError(cliErrorCodes.addressUnavailable);

  const url = `http://${runtimeLoopbackHost}:${address.port}`;
  try { session.bind(url);
  } catch (error) {
    await developmentUi?.close();
    server.closeAllConnections();
    server.close();
    session.release();
    throw error;
  }
  const reportCloseFailure = () => console.error(messages.errors[cliErrorCodes.shutdownFailed]);
  let closing: Promise<void> | undefined;
  const expiry = setTimeout(() => { void close().catch(reportCloseFailure); }, Math.max(0, session.expiresAt - Date.now()));
  function close() {
    clearTimeout(expiry);
    closing ??= (async () => {
      try { await developmentUi?.close(); }
      finally {
        await new Promise<void>((resolve, reject) => {
          server.close(error => {
            try { session.remove(); error ? reject(error) : resolve(); } catch (error) { reject(error); }
          });
          server.closeAllConnections();
        });
      }
    })().finally(onClose);
    return closing;
  }
  return { reviewSession: session.path, url, close };
}
