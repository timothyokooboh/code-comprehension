<script setup lang="ts">
import { computed, nextTick, useId, useTemplateRef } from 'vue';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { useQuizAttempt } from '../composables/useQuizAttempt';
import { messages } from '../locales/en';
import QuizQuestion from './QuizQuestion.vue';
import QuizResult from './QuizResult.vue';
import QuizNavigator from './QuizNavigator.vue';
import { useReviewTransition } from '../composables/useReviewTransition';

const props = defineProps<{ quiz: Quiz }>();
const { answers, result, canSubmit, answer, submit, retake } = useQuizAttempt(props.quiz);
const heading = useTemplateRef('heading');
const formId = useId();
const { updateReview } = useReviewTransition();
let pointerSubmission = false;
const entries = computed(() => props.quiz.questions.map((question) => ({
  anchor: `${formId}-${question.id}`,
  prompt: question.prompt,
  answered: (answers.value.get(question.id)?.length ?? 0) > 0,
  correct: result.value?.questions.find(({ questionId }) => questionId === question.id)?.correct,
})));
const answeredCount = computed(() => entries.value.filter(({ answered }) => answered).length);

async function submitReview() {
  const animate = pointerSubmission;
  pointerSubmission = false;
  if (!canSubmit.value) return;
  await updateReview(submit, animate);
}

async function restart() {
  retake();
  await nextTick();
  heading.value?.focus();
}
</script>

<template>
  <section :aria-label="messages.assessment.label" class="quiz-workspace">
    <aside class="workspace-sidebar">
      <div class="sidebar-content">
        <p class="eyebrow">{{ result ? messages.workspace.reviewMode : messages.workspace.assessmentMode }}</p>
        <h2 ref="heading" tabindex="-1" class="mt-3 break-words text-3xl font-semibold leading-tight tracking-tight">{{ quiz.title }}</h2>
        <p class="mt-3 text-sm text-slate-600">{{ messages.quiz.scope(quiz.scope) }}</p>
        <div v-if="!result" class="my-7">
          <div class="mb-2 flex justify-between gap-2 text-xs font-semibold">
            <span>{{ messages.workspace.progress }}</span>
            <span>{{ messages.workspace.answeredCount(answeredCount, quiz.questions.length) }}</span>
          </div>
          <progress :value="answeredCount" :max="quiz.questions.length" :aria-label="messages.workspace.progress" class="quiz-progress" />
        </div>
        <QuizResult v-if="result" :correct="result.correct" :total="result.total" :percentage="result.percentage" @retake="restart" />
        <QuizNavigator :entries="entries" class="mt-8" />

      </div>
    </aside>
    <div class="workspace-content">
      <div class="workspace-caption">
        <span class="eyebrow">{{ result ? messages.workspace.evidence : messages.workspace.prompt }}</span>
        <span class="text-xs text-slate-500">{{ messages.workspace.questionCount(quiz.questions.length) }}</span>
      </div>
      <form :id="formId" @submit.prevent="submitReview">
        <QuizQuestion
          v-for="(question, index) in quiz.questions" :id="`${formId}-${question.id}`" :key="question.id"
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
.workspace-sidebar { background: var(--surface); border-bottom: 1px solid var(--line); padding: 2rem 1.5rem; }
.workspace-content { min-width: 0; padding: 1.5rem; }
.workspace-caption { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--line); }
.quiz-progress { display: block; width: 100%; height: 4px; appearance: none; border: none; background: var(--line); color: var(--ink); }
.quiz-progress::-webkit-progress-bar { background: var(--line); }
.quiz-progress::-webkit-progress-value { background: var(--ink); }
.quiz-progress::-moz-progress-bar { background: var(--ink); }
@media (min-width: 1024px) {
  .quiz-workspace { grid-template-columns: 270px minmax(0, 1fr); min-height: calc(100vh - 89px); }
  .workspace-sidebar { border-bottom: 0; border-right: 1px solid var(--line); }
  .sidebar-content { position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto; padding: .25rem; }
  .workspace-content { padding: 2rem clamp(1.5rem, 3vw, 4rem); }
}
</style>
