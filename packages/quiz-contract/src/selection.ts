import { assessmentTypes, type Quiz, type Question } from './quiz.ts';

export const defaultProductQuestionCount = 8;

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

export function assessmentQuestionCount(quiz: Quiz) {
  return quiz.type === assessmentTypes.product && quiz.selectionSize !== undefined
    ? Math.min(Math.max(quiz.selectionSize, quiz.selectionGroups?.length ?? 0), quiz.questions.length) : quiz.questions.length;
}

export function selectQuestions(quiz: Quiz, previousIds: readonly string[] = []): Question[] {
  if (quiz.type !== assessmentTypes.product || quiz.selectionSize === undefined) return [...quiz.questions];
  const count = assessmentQuestionCount(quiz);
  const previous = new Set(previousIds);
  const fresh = shuffle(quiz.questions.filter(({ id }) => !previous.has(id)));
  const repeated = shuffle(quiz.questions.filter(({ id }) => previous.has(id)));
  const priority = [...fresh, ...repeated];
  const reserved = new Set<string>();
  for (const group of quiz.selectionGroups ?? []) {
    if (group.some((id) => reserved.has(id))) continue;
    const question = priority.find(({ id }) => group.includes(id));
    if (question) reserved.add(question.id);
  }
  const covered = priority.filter(({ id }) => reserved.has(id));
  const remaining = priority.filter(({ id }) => !reserved.has(id));
  const selected = shuffle([...covered, ...remaining].slice(0, count));
  if (selected.length > 1 && selected.every(({ id }, index) => id === previousIds[index])) {
    selected.push(selected.shift()!);
  }
  return selected;
}
