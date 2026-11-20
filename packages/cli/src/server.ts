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
  const state = createAssessmentState(quiz, source, (input) => loadRevision(source, input));
  const server = createServer((request, response) => {
    const pathname = (request.url ?? '/').split('?')[0];
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

  return {
    url: `http://${runtimeLoopbackHost}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
