import { questionFormats, questionTypes, type QuestionFormat, type Quiz } from '@code-comprehension/quiz-contract';
import { CliError, cliErrorCodes } from '../errors.js';

export function formatProductAssessment(quiz: Quiz, format: QuestionFormat, requestedWritten?: number): Quiz {
  const questions = quiz.questions.filter(question => format === questionFormats.mixed ||
    (question.type === questionTypes.written) === (format === questionFormats.written));
  const ids = new Set(questions.map(question => question.id));
  const selectionGroups = quiz.selectionGroups?.map(group => group.filter(id => ids.has(id))).filter(group => group.length);
  if (requestedWritten !== undefined && (quiz.selectionSize ?? questions.length) > questions.length) {
    throw new CliError(cliErrorCodes.questionFormatUnavailable);
  }
  const count = Math.min(quiz.selectionSize ?? questions.length, questions.length);
  if (!count) throw new CliError(cliErrorCodes.questionFormatUnavailable);
  if (format !== questionFormats.mixed) return { ...quiz, questions, selectionGroups, selectionFormat: format, writtenCount: undefined };
  const written = questions.filter(question => question.type === questionTypes.written).length;
  const mcq = questions.length - written;
  const minimumWritten = Math.max(1, count - mcq);
  const maximumWritten = Math.min(count - 1, written);
  const writtenCount = requestedWritten ?? Math.min(maximumWritten, Math.max(minimumWritten, Math.floor(count / 2)));
  if (count < 2 || writtenCount < minimumWritten || writtenCount > maximumWritten) throw new CliError(cliErrorCodes.questionFormatUnavailable);
  return { ...quiz, questions, selectionGroups, selectionFormat: format, writtenCount };
}
