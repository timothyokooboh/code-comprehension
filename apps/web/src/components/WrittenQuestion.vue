<script setup lang="ts">
import { computed, useId, type DeepReadonly } from 'vue';
import { reviewLimits, reviewStates, type WrittenQuestion, type WrittenFeedback, type ReviewErrorCode, type ReviewSnapshot } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';

const props = defineProps<{
  question: WrittenQuestion; number: number; answer: string; submitted: boolean; locked?: boolean;
  error?: ReviewErrorCode | null; status?: ReviewSnapshot['status']; feedback?: DeepReadonly<WrittenFeedback>;
}>();
const emit = defineEmits<{ answer: [value: string[]] }>();
const inputId = useId();
const reviewing = computed(() => !props.error && props.status === reviewStates.reviewing);
const statusText = computed(() => props.error ? messages.written.errors[props.error] : reviewing.value ? messages.written.reviewing : messages.written.waiting);
function update(event: Event) { emit('answer', [(event.target as HTMLTextAreaElement).value]); }
</script>

<template>
  <section class="written-question" tabindex="-1" :aria-labelledby="`${inputId}-prompt`">
    <h3 :id="`${inputId}-prompt`" class="text-2xl font-semibold leading-snug tracking-tight">{{ messages.quiz.question(number, question.prompt) }}</h3>
    <div v-if="submitted" class="review-panel" :class="{ 'is-complete': feedback }" role="status" aria-live="polite">
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
        <p v-if="!error" class="mt-2 text-sm leading-6">{{ reviewing ? messages.written.reviewingDetail : messages.written.waitingDetail }}</p>
      </template>
    </div>
    <label :for="inputId" class="mt-6 mb-2 block text-sm font-semibold">{{ messages.written.answer }}</label>
    <textarea :id="inputId" :value="answer" :readonly="submitted || locked" :maxlength="reviewLimits.answerCharacters" rows="5"
      :placeholder="messages.written.placeholder" class="w-full resize-y rounded border border-zinc-400 bg-white p-4 leading-7 focus-visible:outline-2 focus-visible:outline-offset-2" @input="update" />
  </section>
</template>

<style scoped>
.written-question { padding: 2rem 0; border-bottom: 1px solid var(--line); scroll-margin-top: 2rem; }
.review-panel { margin-top: 1.25rem; padding: 1.25rem; background: var(--accent-soft); border: 1px solid var(--ink); border-left-width: 4px; border-radius: .25rem; }
.is-complete { background: var(--surface); }
.review-spinner { width: 1.25rem; height: 1.25rem; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: review-spin 1s linear infinite; flex-shrink: 0; }
.waiting-mark { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border: 1px solid currentColor; border-radius: 50%; }
@keyframes review-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .review-spinner { animation: none; } }
</style>
