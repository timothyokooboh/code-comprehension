import { questionTypes, type Question } from './quiz.ts';

function fullCoverage(questions: readonly Question[], groups: readonly string[][], count: number, writtenCount: number) {
  const failed = new Set<string>();
  function search(uncovered: number[], written: number, mcq: number): Question[] | null {
    if (!uncovered.length) return [];
    if (!written && !mcq) return null;
    const key = JSON.stringify([uncovered, written, mcq]);
    if (failed.has(key)) return null;
    const eligible = questions.filter(question => question.type === questionTypes.written ? written > 0 : mcq > 0);
    const maximumCoverage = Math.max(0, ...eligible.map(question =>
      uncovered.filter(index => groups[index]!.includes(question.id)).length));
    if (!maximumCoverage || Math.ceil(uncovered.length / maximumCoverage) > written + mcq) {
      failed.add(key);
      return null;
    }
    // Start with the least flexible scope; one shared question may cover several.
    const candidates = uncovered.map(index => eligible.filter(question => groups[index]!.includes(question.id)))
      .sort((a, b) => a.length - b.length)[0]!;
    for (const question of candidates) {
      const next = uncovered.filter(index => !groups[index]!.includes(question.id));
      const isWritten = question.type === questionTypes.written;
      const rest = search(next, written - Number(isWritten), mcq - Number(!isWritten));
      if (rest) return [question, ...rest];
    }
    failed.add(key);
    return null;
  }
  return search(groups.map((_group, index) => index), writtenCount, count - writtenCount);
}

/** Reserve complete coverage when feasible, including questions shared by scopes.
 * Memoized search stores uncovered scopes and type budgets, not permutations of picks.
 */
export function reserveMixedCoverage(questions: readonly Question[], groups: readonly string[][], count: number, writtenCount: number) {
  const complete = fullCoverage(questions, groups, count, writtenCount);
  if (complete) return complete;
  const selected: Question[] = [];
  let written = writtenCount;
  let mcq = count - writtenCount;
  for (const group of groups) {
    if (selected.some(question => group.includes(question.id))) continue;
    const question = questions.find(question => group.includes(question.id) &&
      (question.type === questionTypes.written ? written > 0 : mcq > 0));
    if (!question) continue;
    selected.push(question);
    if (question.type === questionTypes.written) written--;
    else mcq--;
  }
  return selected;
}
