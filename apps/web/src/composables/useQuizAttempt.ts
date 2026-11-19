import { computed, readonly, ref } from 'vue';
import { scoreQuiz, type Quiz, type QuizResult } from '@code-comprehension/quiz-contract';

import { createAttemptStorage } from '../storage/quiz-attempt';

export function useQuizAttempt(quiz: Quiz) {
  const storage = createAttemptStorage(quiz);
  const saved = storage.read();
  const answers = ref(saved?.answers ?? new Map<string, string[]>());
  const result = ref<QuizResult | null>(saved?.submitted ? scoreQuiz(quiz, answers.value) : null);
  const canSubmit = computed(() => !result.value &&
    quiz.questions.every((question) => (answers.value.get(question.id)?.length ?? 0) > 0));

  function answer(questionId: string, selection: string[]) {
    if (result.value) return;
    answers.value.set(questionId, selection);
    storage.write(answers.value, false);
  }

  function submit() {
    if (!canSubmit.value) return;
    result.value = scoreQuiz(quiz, answers.value);
    storage.write(answers.value, true);
  }

  function retake() {
    answers.value = new Map();
    result.value = null;
    storage.clear();
  }

  return { answers: readonly(answers), result: readonly(result), canSubmit, answer, submit, retake };
}
