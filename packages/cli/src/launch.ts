import open from 'open';
import { explainerRoute, type Explainer, assessmentTypes, assessmentSourceKinds, type Quiz, type AssessmentSource } from '@code-comprehension/quiz-contract';
import { loadQuiz } from './load-quiz.js';
import { startServer } from './server.js';
import { messages } from './locales/en.js';
import { CliError, cliErrorCodes } from './errors.js';

type LocalApplication = Awaited<ReturnType<typeof startServer>>;

function registerShutdown(app: LocalApplication, cleanup: () => Promise<void>) {
  const stop = () => {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    void app.close().finally(cleanup).catch((error: unknown) => {
      console.error(messages.errors[error instanceof CliError ? error.code : cliErrorCodes.shutdownFailed]);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

async function openBrowser(url: string) {
  try {
    await open(url);
  } catch {
    console.warn(messages.browserUnavailable(url));
  }
}

export async function launch(options: { port: number; open: boolean; quiz?: string; devUi?: string }) {
  const quiz = options.quiz ? await loadQuiz(options.quiz) : null;
  await launchAssessment(options, quiz);
}

export async function launchAssessment(
  options: { port: number; open: boolean; resumeReview?: string; devUi?: string }, quiz: Quiz | null,
  cleanup: () => Promise<void> = async () => {},
  source: AssessmentSource = { kind: assessmentSourceKinds.file },
) {
  const app = await startServer(options.port, quiz, source, options.resumeReview, options.devUi);
  registerShutdown(app, cleanup);
  console.log(messages.review.session(app.reviewSession));
  console.log(messages.started(app.url));
  if (quiz?.type === assessmentTypes.product && quiz.selectionSize !== undefined && (quiz.selectionGroups?.length ?? 0) > quiz.selectionSize) {
    console.log(messages.product.limitedCoverage(quiz.selectionSize));
  }
  console.log(messages.stopHint);
  if (options.open) await openBrowser(app.url);
}

export async function launchExplainer(options: { port: number; open: boolean; devUi?: string }, explainer: Explainer, cleanup: () => Promise<void> = async () => {}) {
  const app = await startServer(options.port, null, undefined, undefined, options.devUi, explainer, cleanup);
  registerShutdown(app, async () => {});
  const url = `${app.url}${explainerRoute}`;
  console.log(messages.started(url));
  console.log(messages.stopHint);
  if (options.open) await openBrowser(url);
}
