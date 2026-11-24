import { randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewPaths } from '@code-comprehension/quiz-contract';
import { createWrittenReview } from './written-review/state.js';
import { handleReviewRequest } from './written-review/http.js';
import { createServer } from 'node:http';
import { constants as httpStatus } from 'node:http2';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { applicationName, runtimeStatusPath, runtimeReadyStatus, type RuntimeStatus, quizPath, type Quiz, type AssessmentSource, assessmentPaths, assessmentSourceKinds, runtimeLoopbackHost } from '@code-comprehension/quiz-contract';
import { loadAssets } from './assets.js';
import { CliError, cliErrorCodes } from './errors.js';
import { messages } from './locales/en.js';

import { createAssessmentState } from './assessment/state.js';
import { handleAssessmentRequest } from './assessment/http.js';
import { loadRevision } from './assessment/source.js';

export async function startServer(port: number, quiz: Quiz | null = null, source: AssessmentSource = { kind: assessmentSourceKinds.file }) {
  const assets = await loadAssets(fileURLToPath(new URL('./web/', import.meta.url)));
  const status: RuntimeStatus = { name: applicationName, status: runtimeReadyStatus };
  const state = createAssessmentState(quiz, source, loadRevision);
  const review = createWrittenReview(() => state.snapshot().quiz);
  const tokens = { browser: randomBytes(32).toString('hex'), reviewer: randomBytes(32).toString('hex') };
  const server = createServer((request, response) => {
    const pathname = (request.url ?? '/').split('?')[0];
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
    const asset = assets.get(pathname ?? '/');
    if (!asset) {
      response.writeHead(httpStatus.HTTP_STATUS_NOT_FOUND).end(messages.notFound);
      return;
    }
    response.writeHead(httpStatus.HTTP_STATUS_OK, { 'Content-Type': asset.contentType, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : asset.body);
  });

  server.listen(port, runtimeLoopbackHost);
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new CliError(cliErrorCodes.addressUnavailable);

  let directory: string | undefined;
  let reviewSession: string;
  try {
    directory = await mkdtemp(join(tmpdir(), 'comprehension-review-'));
    reviewSession = join(directory, 'session.json');
    await writeFile(reviewSession, JSON.stringify({ url: `http://${runtimeLoopbackHost}:${address.port}`, token: tokens.reviewer }), { mode: 0o600 });
  } catch (error) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (directory) await rm(directory!, { recursive: true, force: true });
    throw error;
  }
  return {
    reviewSession,
    url: `http://${runtimeLoopbackHost}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => { void rm(directory!, { recursive: true, force: true }).then(() => error ? reject(error) : resolve(), reject); });
      server.closeAllConnections();
    }),
  };
}
