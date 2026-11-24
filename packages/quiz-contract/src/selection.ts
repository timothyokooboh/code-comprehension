import { reserveMixedCoverage } from './selection-coverage.ts';
import { assessmentTypes, questionTypes, type Quiz, type Question } from './quiz.ts';

export const defaultProductQuestionCount = 10;

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
    ? Math.min(quiz.selectionSize, quiz.questions.length) : quiz.questions.length;
}

export function selectQuestions(quiz: Quiz, previousIds: readonly string[] = []): Question[] {
  if (quiz.type !== assessmentTypes.product || quiz.selectionSize === undefined) return [...quiz.questions];
  const count = assessmentQuestionCount(quiz);
  const previous = new Set(previousIds);
  const fresh = shuffle(quiz.questions.filter(({ id }) => !previous.has(id)));
  const repeated = shuffle(quiz.questions.filter(({ id }) => previous.has(id)));
  const priority = [...fresh, ...repeated];
  const reserved = new Set<string>();
  const writtenLimit = quiz.writtenCount;
  let writtenSelected = 0;
  let mcqSelected = 0;
  function canSelect(question: Question) {
    return writtenLimit === undefined || (question.type === questionTypes.written
      ? writtenSelected < writtenLimit : mcqSelected < count - writtenLimit);
  }
  function reserve(question: Question) {
    reserved.add(question.id);
    if (question.type === questionTypes.written) writtenSelected++;
    else mcqSelected++;
  }
  const groups = shuffle(quiz.selectionGroups ?? []);
  const hasFreshQuestion = (group: string[]) => group.some((id) => !previous.has(id));
  groups.sort((a, b) => Number(hasFreshQuestion(b)) - Number(hasFreshQuestion(a)));
  if (writtenLimit !== undefined) {
    for (const question of reserveMixedCoverage(priority, groups, count, writtenLimit)) reserve(question);
  } else {
    for (const group of groups) {
      if (reserved.size === count) break;
      if (group.some((id) => reserved.has(id))) continue;
      const question = priority.find(question => group.includes(question.id));
      if (question) reserve(question);
    }
  }
  for (const question of priority) {
    if (reserved.size === count) break;
    if (!reserved.has(question.id) && canSelect(question)) reserve(question);
  }
  const selected = shuffle(priority.filter(({ id }) => reserved.has(id)));
  if (selected.length > 1 && selected.every(({ id }, index) => id === previousIds[index])) {
    selected.push(selected.shift()!);
  }
  return selected;
}

/** Validate a reported/restored draw against the runtime's count and type contract. */
export function validQuestionSelection(quiz: Quiz, ids: readonly string[]) {
  if (ids.length !== assessmentQuestionCount(quiz) || new Set(ids).size !== ids.length ||
    ids.some(id => !quiz.questions.some(question => question.id === id))) return false;
  if (quiz.writtenCount !== undefined) {
    if (ids.filter(id => quiz.questions.find(question => question.id === id)?.type === questionTypes.written).length !== quiz.writtenCount) return false;
    const groups = quiz.selectionGroups ?? [];
    const coverage = reserveMixedCoverage(quiz.questions, groups, ids.length, quiz.writtenCount);
    const canCoverAll = groups.every(group => coverage.some(question => group.includes(question.id)));
    return !canCoverAll || groups.every(group => group.some(id => ids.includes(id)));
  }
  return !quiz.selectionGroups || ids.length < quiz.selectionGroups.length ||
    quiz.selectionGroups.every(group => group.some(id => ids.includes(id)));
}
