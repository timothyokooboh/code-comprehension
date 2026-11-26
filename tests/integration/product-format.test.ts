import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, launchCli } from '../support/cli.js';
import { createRepository } from '../support/repository.js';
import { quizSchema, selectQuestions, validQuestionSelection } from '../../packages/quiz-contract/src/index.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/mixed-quiz.json', import.meta.url), 'utf8'));
test('cache checks distinguish valid content from requested question-format availability', () => {
  const repo = createRepository();
  try {
    runCli(['--configure-product', 'local', '--repo', repo.path]);
    repo.write('bank.json', JSON.stringify({ version: 1, id: 'overview',
      scope: { kind: 'general', focus: 'system_architecture_v1', name: 'Overview', description: 'Overview', sourcePatterns: ['payment.ts'], supportingFiles: [] },
      quiz: { ...fixture, type: 'product', questions: fixture.questions.filter((q: { type: string }) => q.type !== 'written').map((q: object) => ({ ...q, references: [{ path: 'payment.ts' }] })) } }));
    expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    const check = (format: string) => runCli(['--check-product', 'overview', '--format', format, '--repo', repo.path]);
    expect(JSON.parse(check('mcq').stdout).status).toBe('reusable');
    expect(JSON.parse(check('mixed').stdout)).toMatchObject({ status: 'generation_required', reason: 'question_format' });
    expect(JSON.parse(check('written').stdout).status).toBe('generation_required');
  } finally { repo.dispose(); }
});

test('product launches honour default MCQs, written-only and exact mixed composition across draws', async () => {
  const repo = createRepository();
  try {
    runCli(['--configure-product', 'local', '--repo', repo.path]);
    repo.write('bank.json', JSON.stringify({ version: 1, id: 'overview',
      scope: { kind: 'general', focus: 'system_architecture_v1', name: 'Overview', description: 'Overview', sourcePatterns: ['payment.ts'], supportingFiles: [] },
      quiz: { ...fixture, type: 'product', questions: Array.from({ length: 8 }, (_, index) => ({
        ...fixture.questions[index % 2 ? 2 : 0], id: 'q' + index, prompt: 'Scenario ' + index, references: [{ path: 'payment.ts' }],
      })) } }));
    expect(runCli(['--save-product', join(repo.path, 'bank.json'), '--repo', repo.path]).status).toBe(0);
    for (const [args, expectedWritten] of [[[], 0], [['--format', 'written'], 4], [['--format', 'mixed', '--written-questions', '1'], 1], [['--format', 'mixed'], 2]] as const) {
      const app = await launchCli(['--product-bank', 'overview', '--questions', '4', '--repo', repo.path, ...args]);
      try {
        const quiz = quizSchema.parse(await (await fetch(app.url + '/api/quiz')).json());
        let previous: string[] = [];
        for (let draw = 0; draw < 10; draw++) {
          const selected = selectQuestions(quiz, previous);
          expect(selected).toHaveLength(4);
          expect(selected.filter(q => q.type === 'written')).toHaveLength(expectedWritten);
          previous = selected.map(q => q.id);
        }
      } finally { await app.stop(); }
    }
    repo.write('payment.ts', '// comment-only edit\nexport const retries = 0;\n');
    const changed = JSON.parse(runCli(['--check-product', 'overview', '--format', 'written', '--repo', repo.path]).stdout);
    expect(changed.status).toBe('review_required');
    repo.write('receipt.json', JSON.stringify({ bankId: 'overview', reviewToken: changed.reviewToken, confirmed: true, references: [] }));
    expect(runCli(['--retain-product', join(repo.path, 'receipt.json'), '--repo', repo.path]).status).toBe(0);
    expect(JSON.parse(runCli(['--check-product', 'overview', '--format', 'written', '--repo', repo.path]).stdout).status).toBe('reusable');
    const undersized = runCli(['--product-bank', 'overview', '--format', 'mixed', '--questions', '10', '--written-questions', '2', '--repo', repo.path]);
    expect(undersized.status).toBe(1);
    expect(undersized.stderr).toContain('composition');
    const invalid = runCli(['--product-bank', 'overview', '--format', 'mixed', '--questions', '1', '--repo', repo.path]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('composition');
  } finally { repo.dispose(); }
});

test('mixed sampling preserves scope coverage when only one scope supplies a required type', () => {
  const written = fixture.questions[2];
  const mcq = fixture.questions[0];
  const quiz = quizSchema.parse({ ...fixture, type: 'product', selectionSize: 2, selectionFormat: 'mixed', writtenCount: 1,
    questions: [{ ...written, id: 'aw' }, { ...mcq, id: 'am' }, { ...written, id: 'bw' }],
    selectionGroups: [['aw', 'am'], ['bw']] });
  expect(validQuestionSelection(quiz, ['am', 'aw'])).toBe(false);
  expect(validQuestionSelection(quiz, ['am', 'bw'])).toBe(true);
  for (let draw = 0; draw < 100; draw++) {
    expect(selectQuestions(quiz).map(question => question.id).sort()).toEqual(['am', 'bw']);
  }
});

test('a deduplicated written question can satisfy multiple scopes without exhausting their quota', () => {
  const quiz = quizSchema.parse({ ...fixture, type: 'product', selectionSize: 3, selectionFormat: 'mixed', writtenCount: 1,
    questions: [
      { ...fixture.questions[2], id: 'y' }, { ...fixture.questions[2], id: 'x' },
      { ...fixture.questions[0], id: 'z' }, { ...fixture.questions[0], id: 'm' },
    ], selectionGroups: [['y', 'x'], ['x'], ['z', 'm']] });
  expect(validQuestionSelection(quiz, ['y', 'z', 'm'])).toBe(false);
  for (let draw = 0; draw < 100; draw++) {
    expect(selectQuestions(quiz).map(question => question.id).sort()).toEqual(['m', 'x', 'z']);
  }
});
