import { runtimeLoopbackHost, activeAssessmentSchema, assessmentPaths, revisionRequestSchema } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';
import { QuizValidationError, readQuizData } from '../load-quiz.js';
import { messages } from '../locales/en.js';

const runtimeRequestTimeoutMs = 10_000;

function runtimeUrl(address: string, path: string) {
  try {
    const url = new URL(address);
    if (url.protocol !== 'http:' || url.hostname !== runtimeLoopbackHost || !url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) throw new Error();
    return new URL(path, url);
  } catch { throw new CliError(cliErrorCodes.assessmentUnavailable); }
}

async function requestRuntime(address: string, path: string, body?: unknown) {
  let response: Response;
  let data;
  try {
    response = await fetch(runtimeUrl(address, path), {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(runtimeRequestTimeoutMs),
    });
    data = await response.json();
  } catch (cause) { throw new CliError(cliErrorCodes.assessmentUnavailable, { cause }); }
  if (!response.ok) {
    if (data?.code === cliErrorCodes.quizInvalid && Array.isArray(data.issues)) throw new QuizValidationError(data.issues);
    if (Object.values(cliErrorCodes).includes(data?.code)) throw new CliError(data.code);
    throw new CliError(cliErrorCodes.assessmentUnavailable);
  }
  return data as unknown;
}

export async function readActiveAssessment(address: string) {
  const parsed = activeAssessmentSchema.safeParse(await requestRuntime(address, assessmentPaths.active));
  if (!parsed.success) throw new CliError(cliErrorCodes.assessmentUnavailable);
  return parsed.data;
}

export async function reviseAssessment(address: string, path: string) {
  const parsed = revisionRequestSchema.safeParse(await readQuizData(path));
  if (!parsed.success) throw new CliError(cliErrorCodes.assessmentInvalid);
  await requestRuntime(address, assessmentPaths.revise, parsed.data);
  return messages.assessment.revised;
}
