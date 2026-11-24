import { validQuestionSelection, assessmentTypes, questionTypes, type Quiz, type Answers, reviewLimits } from '@code-comprehension/quiz-contract';

const storageKey = 'code-comprehension:current-attempt:v1';
type Attempt = { questionIds: string[]; answers: Map<string, string[]>; submitted: boolean };

function parseAnswers(value: unknown, quiz: Quiz): Map<string, string[]> | null {
  if (!Array.isArray(value)) return null;
  const answers = new Map<string, string[]>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [id, selection] = entry;
    const question = quiz.questions.find((question) => question.id === id);
    if (!question || answers.has(id) || !Array.isArray(selection)) return null;
    if (question.type === questionTypes.written) {
      if (selection.length > 1 || selection.some((answer) => typeof answer !== 'string' || answer.length > reviewLimits.answerCharacters)) return null;
      answers.set(id, selection);
      continue;
    }
    if (selection.some((option) => !question.options.some(({ id }) => id === option))) return null;
    if (new Set(selection).size !== selection.length) return null;
    if (question.type === questionTypes.single && selection.length > 1) return null;
    answers.set(id, selection);
  }
  return answers;
}

export function createAttemptStorage(quiz: Quiz) {
  // Transport revisions protect agent requests; only a deliberate replacement resets an attempt.
  const { runtimeRevision: _runtimeRevision, ...persistentQuiz } = quiz;
  const identity = JSON.stringify(persistentQuiz);
  const storage = () => quiz.type === assessmentTypes.pr ? sessionStorage : localStorage;

  function read(): Attempt | null {
    try {
      const data = JSON.parse(storage().getItem(storageKey) ?? 'null');
      if (!data || data.identity !== identity || typeof data.submitted !== 'boolean') return null;
      const questionIds: unknown = data.questionIds ?? (quiz.selectionSize === undefined ? quiz.questions.map(({ id }) => id) : null);
      if (!Array.isArray(questionIds) || questionIds.some(id => typeof id !== 'string') ||
        !validQuestionSelection(quiz, questionIds)) return null;
      const selectedQuiz = { ...quiz, questions: questionIds.map((id) => quiz.questions.find((question) => question.id === id)!) };
      const answers = parseAnswers(data.answers, selectedQuiz);
      if (!answers) return null;
      if (data.submitted && selectedQuiz.questions.some(({ id }) => !answers.get(id)?.length)) return null;
      return { questionIds, answers, submitted: data.submitted };
    } catch {
      return null;
    }
  }

  function write(answers: Answers, submitted: boolean, questionIds: readonly string[]) {
    try {
      storage().setItem(storageKey, JSON.stringify({ identity, questionIds, answers: [...answers], submitted }));
    } catch {
      // Storage can be blocked or full; the in-memory assessment remains usable.
    }
  }

  function clear() {
    try {
      storage().removeItem(storageKey);
    } catch {
      // Retaking still resets the current in-memory attempt.
    }
  }

  return { read, write, clear };
}
