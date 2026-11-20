import { computed, readonly, ref } from 'vue';
import { scoreQuiz, selectQuestions, type Quiz, type QuizResult } from '@code-comprehension/quiz-contract';

import { createAttemptStorage } from '../storage/quiz-attempt';

export function useQuizAttempt(quiz: Quiz) {
  const storage = createAttemptStorage(quiz);
  const saved = storage.read();
  const questions = ref(saved
    ? saved.questionIds.map((id) => quiz.questions.find((question) => question.id === id)!)
    : selectQuestions(quiz));
  const assessment = computed<Quiz>(() => ({ ...quiz, questions: questions.value }));
  const answers = ref(saved?.answers ?? new Map<string, string[]>());
  const result = ref<QuizResult | null>(saved?.submitted ? scoreQuiz(assessment.value, answers.value) : null);
  const canSubmit = computed(() => !result.value &&
    assessment.value.questions.every((question) => (answers.value.get(question.id)?.length ?? 0) > 0));

  function persistAttempt(submitted: boolean) {
    storage.write(answers.value, submitted, questions.value.map(({ id }) => id));
  }
  // Persist the selected subset before the first answer so a reload cannot redraw it.
  persistAttempt(saved?.submitted ?? false);

  function answer(questionId: string, selection: string[]) {
    if (result.value) return;
    answers.value.set(questionId, selection);
    persistAttempt(false);
  }

  function submit() {
    if (!canSubmit.value) return;
    result.value = scoreQuiz(assessment.value, answers.value);
    persistAttempt(true);
  }

  function retake() {
    answers.value = new Map();
    result.value = null;
    questions.value = selectQuestions(quiz, questions.value.map(({ id }) => id));
    storage.clear();
    persistAttempt(false);
  }

  return { assessment, answers: readonly(answers), result: readonly(result), canSubmit, answer, submit, retake };
}
