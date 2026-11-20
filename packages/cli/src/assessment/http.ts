import type { IncomingMessage, ServerResponse } from 'node:http';
import { constants as status } from 'node:http2';
import { assessmentPaths } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';
import { QuizValidationError } from '../load-quiz.js';
import type { AssessmentState } from './state.js';

const maximumRequestBytes = 64 * 1024;

export function sendJson(response: ServerResponse, value: unknown, code: number = status.HTTP_STATUS_OK, head = false) {
  response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(head ? undefined : JSON.stringify(value));
}

async function readRequest(request: IncomingMessage) {
  if (request.headers['content-type'] !== 'application/json') throw new CliError(cliErrorCodes.assessmentInvalid);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumRequestBytes) throw new CliError(cliErrorCodes.assessmentInvalid);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new CliError(cliErrorCodes.assessmentInvalid); }
}

export async function handleAssessmentRequest(request: IncomingMessage, response: ServerResponse, state: AssessmentState, origin: string) {
  try {
    // JSON mutations are same-origin browser requests or local CLI calls, never cross-site forms.
    if (`http://${request.headers.host}` !== origin || (request.headers.origin && request.headers.origin !== origin)) {
      throw new CliError(cliErrorCodes.assessmentInvalid);
    }
    const path = request.url?.split('?')[0];
    if (path === assessmentPaths.active && (request.method === 'GET' || request.method === 'HEAD')) {
      sendJson(response, state.snapshot(), status.HTTP_STATUS_OK, request.method === 'HEAD');
    } else if (path === assessmentPaths.view && request.method === 'PUT') {
      state.publishDisplay(await readRequest(request));
      sendJson(response, null);
    } else if (path === assessmentPaths.revise && request.method === 'POST') {
      sendJson(response, await state.replace(await readRequest(request)));
    } else response.writeHead(status.HTTP_STATUS_METHOD_NOT_ALLOWED).end();
  } catch (error) {
    const code = error instanceof CliError ? error.code : cliErrorCodes.assessmentInvalid;
    sendJson(response, { code, ...(error instanceof QuizValidationError ? { issues: error.issues } : {}) },
      code === cliErrorCodes.assessmentStale ? status.HTTP_STATUS_CONFLICT : status.HTTP_STATUS_BAD_REQUEST);
  }
}
