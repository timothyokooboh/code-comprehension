<script setup lang="ts">
import { computed, useId, type DeepReadonly } from 'vue';
import { reviewStates, type WrittenQuestion, type WrittenFeedback, type ReviewErrorCode, type ReviewSnapshot } from '@code-comprehension/quiz-contract';
import WrittenAnswer from './WrittenAnswer.vue';
import { messages } from '../locales/en';

const props = defineProps<{
  question: WrittenQuestion; number: number; answer: string; submitted: boolean; locked?: boolean;
  error?: ReviewErrorCode | null; status?: ReviewSnapshot['status']; feedback?: DeepReadonly<WrittenFeedback>;
}>();
const emit = defineEmits<{ answer: [value: string[]]; recording: [active: boolean] }>();
const inputId = useId();
const reviewing = computed(() => !props.error && props.status === reviewStates.reviewing);
const stateCopy = computed(() => messages.written.states[props.status ?? reviewStates.disconnected]);
const statusText = computed(() => props.error ? messages.written.errors[props.error]
  : !props.submitted ? messages.written.pending : stateCopy.value.title);
const recovery = computed(() => Boolean(props.error) || !props.submitted || props.status === reviewStates.disconnected || props.status === reviewStates.failed);
</script>

<template>
  <section class="written-question" tabindex="-1" :aria-labelledby="`${inputId}-prompt`">
    <h3 :id="`${inputId}-prompt`" class="text-2xl font-medium leading-snug tracking-tight">{{ messages.quiz.question(number, question.prompt) }}</h3>
    <div v-if="submitted || locked" class="review-panel" :class="{ 'is-complete': feedback, 'needs-recovery': !feedback && recovery }" role="status" aria-live="polite">
      <template v-if="feedback">
        <h4 class="font-semibold">{{ messages.written.verdicts[feedback.verdict] }}</h4>
        <p class="mt-2">{{ feedback.summary }}</p>
        <h5 class="mt-4 font-semibold">{{ messages.written.understood }}</h5>
        <p>{{ feedback.understood }}</p>
        <h5 class="mt-4 font-semibold">{{ messages.written.missing }}</h5>
        <p>{{ feedback.missing }}</p>
        <h5 class="mt-4 font-semibold">{{ messages.explanation.references }}</h5>
        <ul><li v-for="reference in feedback.references" :key="messages.explanation.location(reference.path, reference.line)" class="break-all font-mono text-sm">{{ messages.explanation.location(reference.path, reference.line) }}</li></ul>
      </template>
      <template v-else>
        <div class="flex items-center gap-3 font-semibold">
          <span v-if="reviewing" class="review-spinner" aria-hidden="true" />
          <span v-else class="waiting-mark" aria-hidden="true">…</span>
          {{ statusText }}
        </div>
        <p class="mt-2 text-sm leading-6">{{ submitted ? stateCopy.detail : messages.written.pendingDetail }}</p>
      </template>
    </div>
    <label :for="inputId" class="mt-6 mb-2 block text-sm font-semibold">{{ messages.written.answer }}</label>
    <WrittenAnswer :id="inputId" :answer="answer" :readonly="submitted || Boolean(locked)"
      @answer="emit('answer', $event)" @recording="emit('recording', $event)" />
  </section>
</template>

<style scoped>
.written-question { padding: 2rem 0; border-bottom: 1px solid var(--line); scroll-margin-top: 2rem; }
.review-panel { margin-top: 1.25rem; padding: 1.25rem; background: var(--accent-soft); border: 1px solid var(--ink); border-left-width: 4px; border-radius: .25rem; }
.needs-recovery { background: #fff8e6; border-color: #9a6700; }
.is-complete { background: var(--surface); }
.review-spinner { width: 1.25rem; height: 1.25rem; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: review-spin 1s linear infinite; flex-shrink: 0; }
.waiting-mark { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border: 1px solid currentColor; border-radius: 50%; }
@keyframes review-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .review-spinner { animation: none; } }
</style>
