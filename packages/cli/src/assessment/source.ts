import { assessmentSourceKinds, type AssessmentSource, type RevisionInput } from '@code-comprehension/quiz-contract';
import { loadQuiz } from '../load-quiz.js';
import { loadPrAssessment } from '../pr/assessment.js';
import { productAssessment } from '../product/bank.js';
import { CliError, cliErrorCodes } from '../errors.js';

export async function loadRevision(source: AssessmentSource, input: RevisionInput) {
  if (source.kind === assessmentSourceKinds.product && 'bankIds' in input) return productAssessment(source.repo, input.bankIds);
  if (source.kind === assessmentSourceKinds.pr && 'quizPath' in input) return loadPrAssessment(source.directory, input.quizPath);
  if (source.kind === assessmentSourceKinds.file && 'quizPath' in input) return loadQuiz(input.quizPath);
  throw new CliError(cliErrorCodes.assessmentSourceInvalid);
}
