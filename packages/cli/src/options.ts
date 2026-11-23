import { questionCountSchema } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from './errors.js';
import { InvalidArgumentError } from 'commander';
import { messages } from './locales/en.js';

export const automaticPort = 0;
export const maximumPort = 65_535;

export function parsePort(value: string) {
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < automaticPort || port > maximumPort) {
    throw new InvalidArgumentError(messages.invalidPort(maximumPort));
  }
  return port;
}

export function parseQuestionCount(value: string) {
  const parsed = questionCountSchema.safeParse(Number(value));
  if (!/^\d+$/.test(value) || !parsed.success) throw new CliError(cliErrorCodes.questionCountInvalid);
  return parsed.data;
}
