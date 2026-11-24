import { ReviewError } from './written-review/state.js';
import { reviewErrors } from '@code-comprehension/quiz-contract';
import { CommanderError, type Command, type Help } from 'commander';
import { CliError, cliErrorCodes } from './errors.js';
import { messages } from './locales/en.js';
import { QuizValidationError } from './load-quiz.js';
import { formatQuizIssues } from './quiz-diagnostics.js';
import { maximumPort } from './options.js';

const commanderErrorCodes = {
  invalidArgument: 'commander.invalidArgument',
  missingOptionArgument: 'commander.optionMissingArgument',
} as const;

export function formatHelp(command: Command, helper: Help) {
  const options = helper.visibleOptions(command).map((option) =>
    `  ${helper.optionTerm(option)}  ${option.description}`,
  );
  return [messages.usage(command.name()), '', command.description(), '', messages.optionsHeading, ...options, ''].join('\n');
}

function commandErrorMessage(error: CommanderError) {
  switch (error.code) {
    case commanderErrorCodes.invalidArgument:
      return messages.invalidPort(maximumPort);
    case commanderErrorCodes.missingOptionArgument:
      return messages.missingOptionValue;
    default:
      return messages.invalidArguments;
  }
}

export function reportFailure(error: unknown) {
  if (error instanceof CommanderError && error.exitCode === 0) return;
  if (error instanceof ReviewError) {
    const copy = { [reviewErrors.invalid]: messages.review.invalid, [reviewErrors.stale]: messages.review.stale,
      [reviewErrors.forbidden]: messages.review.forbidden, [reviewErrors.unavailable]: messages.review.unavailable };
    console.error(copy[error.code]);
    if (error.issues) console.error(formatQuizIssues(error.issues));
    process.exitCode = 1;
    return;
  }
  const message = error instanceof CommanderError
    ? commandErrorMessage(error)
    : messages.errors[error instanceof CliError ? error.code : cliErrorCodes.startupFailed];
  console.error(message);
  if (error instanceof QuizValidationError) console.error(formatQuizIssues(error.issues));
  process.exitCode = 1;
}
