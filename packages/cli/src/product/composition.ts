import { type Question, type Quiz } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en.js';
import { CliError, cliErrorCodes } from '../errors.js';
import { productScopeKinds, type ProductBank } from './bank-contract.js';

type AssessmentBank = Pick<ProductBank, 'id' | 'scope' | 'quiz'>;

// Length prefixes keep identities unambiguous even when identifiers contain separators.
function identity(parts: string[]) {
  return parts.map((part) => `${part.length}_${part}`).join('_');
}

function questionContent(question: Question) {
  return JSON.stringify({
    prompt: question.prompt.trim(), type: question.type,
    options: question.options.map(({ text }) => text.trim()).sort(),
    answers: question.options.filter(({ id }) => question.correctOptionIds.includes(id)).map(({ text }) => text.trim()).sort(),
  });
}

export function composeProductBanks(banks: AssessmentBank[], selectionSize: number): Quiz {
  const first = banks[0];
  if (!first || (banks.length > 1 && banks.some(({ scope }) => scope.kind === productScopeKinds.general))) {
    throw new CliError(cliErrorCodes.productScopesInvalid);
  }
  if (banks.length === 1) return { ...first.quiz, selectionSize, scope: [first.scope.name] };
  const questions: Question[] = [];
  const byContent = new Map<string, Question>();
  const selectionGroups = banks.map((bank) => {
    const group = new Set<string>();
    for (const question of bank.quiz.questions) {
      const content = questionContent(question);
      let combined = byContent.get(content);
      if (!combined) {
        combined = { ...question, id: identity([bank.id, question.id]), references: [...question.references] };
        byContent.set(content, combined);
        questions.push(combined);
      } else {
        for (const reference of question.references) {
          if (!combined.references.some(({ path, line }) => path === reference.path && line === reference.line)) {
            combined.references.push(reference);
          }
        }
      }
      group.add(combined.id);
    }
    return [...group];
  });
  const scope = banks.map((bank) => bank.scope.name);
  return {
    schemaVersion: first.quiz.schemaVersion, type: first.quiz.type,
    id: identity(banks.map(({ id }) => id)), title: messages.product.combinedTitle(scope),
    scope, selectionSize, selectionGroups, questions,
  };
}
