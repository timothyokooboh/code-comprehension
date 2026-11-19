import { expect, test } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { quizSchema, type Quiz } from '../../packages/quiz-contract/src/index.js';
import { runCli } from '../support/cli.js';

const fixture: Quiz = JSON.parse(readFileSync(new URL('../fixtures/quiz.json', import.meta.url), 'utf8'));

test.each([
  ['unsupported version', (quiz: Quiz) => { Object.assign(quiz, { schemaVersion: 99 }); }, 'schemaVersion'],
  ['duplicate questions', (quiz: Quiz) => { quiz.questions[1]!.id = 'retry'; }, 'questions.1.id'],
  ['duplicate options', (quiz: Quiz) => { quiz.questions[0]!.options[1]!.id = 'retry'; }, 'questions.0.options'],
  ['duplicate answers', (quiz: Quiz) => { quiz.questions[1]!.correctOptionIds = ['key', 'key']; }, 'questions.1.correctOptionIds'],
  ['unknown answer', (quiz: Quiz) => { quiz.questions[0]!.correctOptionIds = ['missing']; }, 'questions.0.correctOptionIds'],
  ['single answer count', (quiz: Quiz) => { quiz.questions[0]!.correctOptionIds = ['retry', 'new']; }, 'questions.0.correctOptionIds'],
  ['multiple answer count', (quiz: Quiz) => { quiz.questions[1]!.correctOptionIds = ['key']; }, 'questions.1.correctOptionIds'],
  ['empty explanation', (quiz: Quiz) => { quiz.questions[0]!.explanation.concise = ''; }, 'questions.0.explanation.concise'],
  ['missing references', (quiz: Quiz) => { quiz.questions[0]!.references = []; }, 'questions.0.references'],
  ['empty questions', (quiz: Quiz) => { quiz.questions = []; }, 'questions'],
])('rejects %s with a field location', (_name, mutate, path) => {
  const quiz = structuredClone(fixture);
  mutate(quiz);
  const parsed = quizSchema.safeParse(quiz);
  expect(parsed.success).toBe(false);
  if (!parsed.success) expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toContain(path);
});

test('the CLI rejects invalid input before starting and leaves the input unchanged', () => {
  const directory = mkdtempSync(join(tmpdir(), 'comprehension-validation-'));
  const path = join(directory, 'quiz.json');
  const quiz = structuredClone(fixture);
  quiz.questions[0]!.correctOptionIds = ['missing'];
  const contents = JSON.stringify(quiz);
  try {
    writeFileSync(path, contents);
    const invalid = runCli(['--no-open', '--quiz', path]);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).not.toContain('http://');
    expect(invalid.stderr).toContain('questions.0.correctOptionIds');
    expect(invalid.stderr).toContain('Every correct answer must reference an option');
    expect(readFileSync(path, 'utf8')).toBe(contents);
    writeFileSync(path, '{');
    expect(runCli(['--quiz', path]).stderr).toContain('not valid JSON');
    expect(runCli(['--quiz', join(directory, 'missing.json')]).stderr).toContain('Unable to read the quiz file');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
