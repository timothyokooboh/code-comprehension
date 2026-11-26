import { explainerIssueCodes, quizIssueCodes, type QuizValidationIssue } from '@code-comprehension/quiz-contract';
import { messages } from './locales/en.js';

function describeIssue(issue: QuizValidationIssue) {
  if (issue.code === 'custom') {
    switch (issue.params?.reason) {
      case explainerIssueCodes.duration: return messages.explainer.duration;
      case explainerIssueCodes.words: return messages.explainer.words;
      case explainerIssueCodes.reference: return messages.explainer.reference;
      case explainerIssueCodes.comparison: return messages.explainer.comparison;
      case quizIssueCodes.duplicateId: return messages.quizValidation.duplicateId;
      case quizIssueCodes.invalidSelectionGroup: return messages.quizValidation.invalidSelectionGroup;
      case quizIssueCodes.unknownAnswer: return messages.quizValidation.unknownAnswer;
      case quizIssueCodes.answerCount: return messages.quizValidation.answerCount;
    }
  }
  switch (issue.code) {
    case 'invalid_type': return messages.quizValidation.expectedType(issue.expected);
    case 'too_big': return messages.quizValidation.tooBig(String(issue.maximum));
    case 'too_small': return messages.quizValidation.tooSmall(String(issue.minimum));
    case 'invalid_value': return messages.quizValidation.allowedValues(issue.values.map(String).join(', '));
    case 'unrecognized_keys': return messages.quizValidation.unknownFields(issue.keys.join(', '));
    default: return messages.quizValidation.invalidFormat;
  }
}

export function formatQuizIssues(issues: QuizValidationIssue[]) {
  return issues.map((issue) => messages.quizValidation.atPath(
    issue.path.map(String).join('.') || messages.quizValidation.root,
    describeIssue(issue),
  )).join('\n');
}
