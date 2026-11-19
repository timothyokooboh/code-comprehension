import type { Quiz, Question } from './quiz.ts';

export type Answers = ReadonlyMap<string, readonly string[]>;
const percentageScale = 100;

function isCorrect(question: Question, selection: readonly string[]) {
  const selected = new Set(selection);
  return selected.size === selection.length && selected.size === question.correctOptionIds.length &&
    question.correctOptionIds.every((id) => selected.has(id));
}

export function scoreQuiz(quiz: Quiz, answers: Answers) {
  const questions = quiz.questions.map((question) => ({
    questionId: question.id,
    correct: isCorrect(question, answers.get(question.id) ?? []),
    correctOptionIds: [...question.correctOptionIds],
  }));
  const correct = questions.filter((question) => question.correct).length;
  const total = questions.length;
  return { correct, total, percentage: Math.round(correct / total * percentageScale), questions };
}

export type QuizResult = ReturnType<typeof scoreQuiz>;
