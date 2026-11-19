<script setup lang="ts">
import { computed, nextTick, useTemplateRef, type DeepReadonly } from 'vue';
import type { Answers, Quiz, QuizResult as AssessmentResult } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';
import QuizResult from './QuizResult.vue';
import QuizNavigator from './QuizNavigator.vue';

const props = defineProps<{
  quiz: Quiz;
  answers: Answers;
  result: DeepReadonly<AssessmentResult> | null;
  anchorPrefix: string;
}>();
const emit = defineEmits<{ retake: [] }>();
const heading = useTemplateRef('heading');
const entries = computed(() => props.quiz.questions.map((question) => ({
  anchor: `${props.anchorPrefix}-${question.id}`,
  prompt: question.prompt,
  answered: (props.answers.get(question.id)?.length ?? 0) > 0,
  correct: props.result?.questions.find(({ questionId }) => questionId === question.id)?.correct,
})));
const answeredCount = computed(() => entries.value.filter(({ answered }) => answered).length);

async function restart() {
  emit('retake');
  await nextTick();
  heading.value?.focus();
}
</script>

<template>
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
</template>

<style scoped>
.workspace-sidebar { background: var(--surface); border-bottom: 1px solid var(--line); padding: 2rem 1.5rem; }
.quiz-progress { display: block; width: 100%; height: 4px; appearance: none; border: none; background: var(--line); color: var(--ink); }
.quiz-progress::-webkit-progress-bar { background: var(--line); }
.quiz-progress::-webkit-progress-value { background: var(--ink); }
.quiz-progress::-moz-progress-bar { background: var(--ink); }
@media (min-width: 1024px) {
  .workspace-sidebar { border-bottom: 0; border-right: 1px solid var(--line); }
  .sidebar-content { position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto; padding: .25rem; }
}
</style>
