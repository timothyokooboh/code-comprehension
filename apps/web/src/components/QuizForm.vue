<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import { useAssessmentDisplay } from '../composables/useAssessmentDisplay';
import { questionTypes, type Quiz } from '@code-comprehension/quiz-contract';
import { useQuizAttempt } from '../composables/useQuizAttempt';
import { messages } from '../locales/en';
import WrittenQuestion from './WrittenQuestion.vue';
import { useWrittenReview } from '../composables/useWrittenReview';
import QuizQuestion from './QuizQuestion.vue';
import QuizSidebar from './QuizSidebar.vue';
import { useReviewTransition } from '../composables/useReviewTransition';

const props = defineProps<{ quiz: Quiz }>();
const { assessment, attemptId, answers, result, canSubmit, answer, submit, retake, restoreReview, nextQuestionIds } = useQuizAttempt(props.quiz);
const { unavailable: displayUnavailable } = useAssessmentDisplay(assessment, attemptId);
const review = useWrittenReview(assessment);
const { snapshot: reviewSnapshot, busy: reviewBusy, error: reviewError, locked: reviewLocked } = review;
watch(reviewSnapshot, (snapshot) => { if (snapshot) restoreReview(snapshot); }, { immediate: true });
async function restart() {
  if (review.enabled) await review.retake(nextQuestionIds());
  else retake();
}
const recordingQuestions = ref(new Set<string>());
function setRecording(id: string, active: boolean) {
  if (active) recordingQuestions.value.add(id);
  else recordingQuestions.value.delete(id);
}
const formId = useId();
const { updateReview } = useReviewTransition();
let pointerSubmission = false;

async function submitReview() {
  const animate = pointerSubmission;
  pointerSubmission = false;
  if (!canSubmit.value || recordingQuestions.value.size) return;
  if (review.enabled && !await review.submit(answers.value)) return;
  await updateReview(submit, animate);
}

</script>

<template>
  <section :aria-label="messages.assessment.label" class="quiz-workspace">
    <QuizSidebar :quiz="assessment" :answers="answers" :result="result" :anchor-prefix="formId" :has-written="review.enabled" :review="reviewSnapshot" :retaking="reviewBusy" @retake="restart" />
    <div class="workspace-content">
      <p v-if="displayUnavailable" role="status" class="mb-4 text-sm">{{ messages.quiz.displayUnavailable }}</p>
      <div class="workspace-caption">
        <span class="eyebrow">{{ result ? messages.workspace.evidence : messages.workspace.prompt }}</span>
        <span class="text-xs text-slate-500">{{ messages.workspace.questionCount(assessment.questions.length) }}</span>
      </div>
      <form :id="formId" @submit.prevent="submitReview">
        <template v-for="(question, index) in assessment.questions" :key="question.id">
          <WrittenQuestion v-if="question.type === questionTypes.written" :id="`${formId}-${question.id}`"
            :question="question" :number="index + 1" :answer="answers.get(question.id)?.[0] ?? ''"
            :submitted="result !== null" :locked="reviewLocked" :status="reviewSnapshot?.status" :error="reviewError"
            :feedback="reviewSnapshot?.feedback?.reviews.find(item => item.questionId === question.id)"
            @answer="answer(question.id, $event)" @recording="setRecording(question.id, $event)" />
          <QuizQuestion v-else
            :id="`${formId}-${question.id}`" :key="question.id"
            :question="question" :number="index + 1" :selected="answers.get(question.id) ?? []"
            :submitted="result !== null" :locked="reviewLocked" @answer="answer(question.id, $event)"
          />
        </template>
        <p v-if="reviewError" role="alert" class="mt-4 text-red-800">{{ messages.written.errors[reviewError] }} {{ reviewLocked ? messages.written.retryLocked : '' }}</p>
        <div v-if="!result" class="py-7">
          <p class="mb-4 text-sm text-slate-500">{{ recordingQuestions.size ? messages.speech.finishFirst : messages.quiz.submitHint }}</p>
          <button :disabled="!canSubmit || reviewBusy || recordingQuestions.size > 0" type="submit" class="primary-button" @click="pointerSubmission = $event.detail > 0">
            {{ messages.quiz.submit }}<span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.quiz-workspace { display: grid; grid-template-columns: minmax(0, 1fr); }
.workspace-content { width: 100%; max-width: 60rem; min-width: 0; margin-inline: auto; padding: 1.5rem; }
.workspace-caption { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--line); }
@media (min-width: 1024px) {
  .quiz-workspace { grid-template-columns: 320px minmax(0, 1fr); min-height: calc(100vh - 89px); }
  .workspace-content { padding: 2rem clamp(1.5rem, 3vw, 4rem); }
}
</style>
