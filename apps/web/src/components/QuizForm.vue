<script setup lang="ts">
import { useId } from 'vue';
import { useAssessmentDisplay } from '../composables/useAssessmentDisplay';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { useQuizAttempt } from '../composables/useQuizAttempt';
import { messages } from '../locales/en';
import QuizQuestion from './QuizQuestion.vue';
import QuizSidebar from './QuizSidebar.vue';
import { useReviewTransition } from '../composables/useReviewTransition';

const props = defineProps<{ quiz: Quiz }>();
const { assessment, answers, result, canSubmit, answer, submit, retake } = useQuizAttempt(props.quiz);
const { unavailable: displayUnavailable } = useAssessmentDisplay(assessment);
const formId = useId();
const { updateReview } = useReviewTransition();
let pointerSubmission = false;

async function submitReview() {
  const animate = pointerSubmission;
  pointerSubmission = false;
  if (!canSubmit.value) return;
  await updateReview(submit, animate);
}

</script>

<template>
  <section :aria-label="messages.assessment.label" class="quiz-workspace">
    <QuizSidebar :quiz="assessment" :answers="answers" :result="result" :anchor-prefix="formId" @retake="retake" />
    <div class="workspace-content">
      <p v-if="displayUnavailable" role="status" class="mb-4 text-sm">{{ messages.quiz.displayUnavailable }}</p>
      <div class="workspace-caption">
        <span class="eyebrow">{{ result ? messages.workspace.evidence : messages.workspace.prompt }}</span>
        <span class="text-xs text-slate-500">{{ messages.workspace.questionCount(assessment.questions.length) }}</span>
      </div>
      <form :id="formId" @submit.prevent="submitReview">
        <QuizQuestion
          v-for="(question, index) in assessment.questions" :id="`${formId}-${question.id}`" :key="question.id"
          :question="question" :number="index + 1" :selected="answers.get(question.id) ?? []"
          :submitted="result !== null" @answer="answer(question.id, $event)"
        />
        <div v-if="!result" class="py-7">
          <p class="mb-4 text-sm text-slate-500">{{ messages.quiz.submitHint }}</p>
          <button :disabled="!canSubmit" type="submit" class="primary-button" @click="pointerSubmission = $event.detail > 0">
            {{ messages.quiz.submit }}<span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.quiz-workspace { display: grid; grid-template-columns: minmax(0, 1fr); }
.workspace-content { min-width: 0; padding: 1.5rem; }
.workspace-caption { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--line); }
@media (min-width: 1024px) {
  .quiz-workspace { grid-template-columns: 270px minmax(0, 1fr); min-height: calc(100vh - 89px); }
  .workspace-content { padding: 2rem clamp(1.5rem, 3vw, 4rem); }
}
</style>
