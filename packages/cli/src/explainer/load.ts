import { open } from 'node:fs/promises';
import {
  explainerLimits,
  explainerSchema,
  type QuizValidationIssue,
} from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';
export class ExplainerValidationError extends CliError {
  constructor(readonly issues: QuizValidationIssue[]) {
    super(cliErrorCodes.explainerInvalid);
  }
}
export async function loadExplainer(path: string) {
  let input: unknown;
  try {
    const file = await open(path, 'r');
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > explainerLimits.inputBytes)
        throw new CliError(cliErrorCodes.explainerUnreadable);
      const buffer = Buffer.alloc(explainerLimits.inputBytes + 1);
      let size = 0;
      while (size < buffer.length) {
        const read = await file.read(buffer, size, buffer.length - size, null);
        if (!read.bytesRead) break;
        size += read.bytesRead;
      }
      if (size > explainerLimits.inputBytes)
        throw new CliError(cliErrorCodes.explainerUnreadable);
      input = JSON.parse(buffer.subarray(0, size).toString('utf8'));
    } finally {
      await file.close();
    }
  } catch (cause) {
    throw new CliError(cliErrorCodes.explainerUnreadable, { cause });
  }
  const parsed = explainerSchema.safeParse(input);
  if (!parsed.success) throw new ExplainerValidationError(parsed.error.issues);
  return parsed.data;
}
