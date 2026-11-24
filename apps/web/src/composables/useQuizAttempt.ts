import { computed, readonly, ref } from 'vue';
import { questionTypes, scoreQuiz, selectQuestions, type Quiz, type QuizResult, type ReviewSnapshot } from '@code-comprehension/quiz-contract';

import { createAttemptStorage } from '../storage/quiz-attempt';

export function useQuizAttempt(quiz: Quiz) {
  const storage = createAttemptStorage(quiz);
  const saved = storage.read();
  const questions = ref(saved
    ? saved.questionIds.map((id) => quiz.questions.find((question) => question.id === id)!)
    : selectQuestions(quiz));
  const assessment = computed<Quiz>(() => ({ ...quiz, questions: questions.value }));
  const attemptId = ref(saved?.attemptId);
  const answers = ref(saved?.answers ?? new Map<string, string[]>());
  const result = ref<QuizResult | null>(saved?.submitted ? scoreQuiz(assessment.value, answers.value) : null);
  const canSubmit = computed(() => !result.value &&
    assessment.value.questions.every((question) => question.type === questionTypes.written ? Boolean(answers.value.get(question.id)?.[0]?.trim()) : (answers.value.get(question.id)?.length ?? 0) > 0));

  function persistAttempt(submitted: boolean) {
    storage.write(answers.value, submitted, questions.value.map(({ id }) => id), attemptId.value);
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

  function restoreReview(review: ReviewSnapshot) {
    const changed = attemptId.value !== undefined && attemptId.value !== review.attemptId;
    attemptId.value = review.attemptId;
    if (changed) { answers.value = new Map(); result.value = null; }
    if (review.questionIds.length && JSON.stringify(review.questionIds) !== JSON.stringify(questions.value.map(q => q.id))) {
      questions.value = review.questionIds.map(id => quiz.questions.find(question => question.id === id)!);
    }
    if (review.submission) {
      answers.value = new Map(Object.entries(review.submission.answers));
      result.value = scoreQuiz(assessment.value, answers.value);
    }
    persistAttempt(result.value !== null);
  }
  function nextQuestionIds() {
    return selectQuestions(quiz, questions.value.map(({ id }) => id)).map(question => question.id);
  }

  function retake() {
    answers.value = new Map();
    result.value = null;
    questions.value = selectQuestions(quiz, questions.value.map(({ id }) => id));
    storage.clear();
    persistAttempt(false);
  }

  return { assessment, attemptId: readonly(attemptId), answers: readonly(answers), result: readonly(result), canSubmit, answer, submit, retake, restoreReview, nextQuestionIds };
}
