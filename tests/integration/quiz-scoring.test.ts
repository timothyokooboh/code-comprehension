import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { quizSchema } from '../../packages/quiz-contract/src/quiz.js';
import { scoreQuiz } from '../../packages/quiz-contract/src/scoring.js';

const quiz = quizSchema.parse(JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8')));

test('scores only exact answer sets, regardless of selection order', () => {
  expect(scoreQuiz(quiz, new Map([
    ['retry', ['retry']], ['guarantees', ['record', 'key']],
  ]))).toMatchObject({ correct: 2, total: 2, percentage: 100 });
  expect(scoreQuiz(quiz, new Map([
    ['retry', ['retry']], ['guarantees', ['key', 'record', 'duplicate']],
  ]))).toMatchObject({ correct: 1, total: 2, percentage: 50 });
  expect(scoreQuiz(quiz, new Map([
    ['guarantees', ['key']],
  ]))).toMatchObject({ correct: 0, total: 2, percentage: 0 });
});
