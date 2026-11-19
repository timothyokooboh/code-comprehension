import { questionTypes, type Quiz, type Answers } from '@code-comprehension/quiz-contract';

const storageKey = 'code-comprehension:current-attempt:v1';
type Attempt = { answers: Map<string, string[]>; submitted: boolean };

function parseAnswers(value: unknown, quiz: Quiz): Map<string, string[]> | null {
  if (!Array.isArray(value)) return null;
  const answers = new Map<string, string[]>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [id, selection] = entry;
    const question = quiz.questions.find((question) => question.id === id);
    if (!question || answers.has(id) || !Array.isArray(selection)) return null;
    if (selection.some((option) => !question.options.some(({ id }) => id === option))) return null;
    if (new Set(selection).size !== selection.length) return null;
    if (question.type === questionTypes.single && selection.length > 1) return null;
    answers.set(id, selection);
  }
  return answers;
}

export function createAttemptStorage(quiz: Quiz) {
  const identity = JSON.stringify(quiz);

  function read(): Attempt | null {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (!data || data.identity !== identity || typeof data.submitted !== 'boolean') return null;
      const answers = parseAnswers(data.answers, quiz);
      if (!answers) return null;
      if (data.submitted && quiz.questions.some(({ id }) => !answers.get(id)?.length)) return null;
      return { answers, submitted: data.submitted };
    } catch {
      return null;
    }
  }

  function write(answers: Answers, submitted: boolean) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ identity, answers: [...answers], submitted }));
    } catch {
      // Storage can be blocked or full; the in-memory assessment remains usable.
    }
  }

  function clear() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Retaking still resets the current in-memory attempt.
    }
  }

  return { read, write, clear };
}
