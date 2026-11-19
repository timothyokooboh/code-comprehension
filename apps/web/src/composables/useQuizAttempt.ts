import { computed, readonly, ref } from 'vue';
import { scoreQuiz, type Quiz, type QuizResult } from '@code-comprehension/quiz-contract';

export function useQuizAttempt(quiz: Quiz) {
  const answers = ref(new Map<string, string[]>());
  const result = ref<QuizResult | null>(null);
  const canSubmit = computed(() => !result.value &&
    quiz.questions.every((question) => (answers.value.get(question.id)?.length ?? 0) > 0));

  function answer(questionId: string, selection: string[]) {
    if (!result.value) answers.value.set(questionId, selection);
  }

  function submit() {
    if (canSubmit.value) result.value = scoreQuiz(quiz, answers.value);
  }

  function retake() {
    answers.value = new Map();
    result.value = null;
  }

  return { answers: readonly(answers), result: readonly(result), canSubmit, answer, submit, retake };
}
