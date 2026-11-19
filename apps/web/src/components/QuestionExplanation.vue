<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import type { Question } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';
import QuestionDiagram from './QuestionDiagram.vue';

const props = defineProps<{ question: Question; number: number }>();
const detailed = ref(false);
const explanationId = useId();
const explanation = computed(() => detailed.value
  ? props.question.explanation.detailed : props.question.explanation.concise);
const toggleLabel = computed(() => detailed.value
  ? messages.explanation.showConcise : messages.explanation.showDetailed);

function toggleExplanation() {
  detailed.value = !detailed.value;
}
</script>

<template>
  <section :aria-label="messages.explanation.label(number)" class="explanation-panel">
    <h3 class="eyebrow">{{ messages.explanation.heading }}</h3>
    <p :id="explanationId" class="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{{ explanation }}</p>
    <button
      type="button" :aria-controls="explanationId" :aria-pressed="detailed"
      class="mt-3 cursor-pointer rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-900 pointer-fine:hover:bg-emerald-50 transition-[background-color] duration-150 ease-[ease] motion-reduce:duration-100 focus-visible:outline-2 focus-visible:outline-offset-4"
      @click="toggleExplanation"
    >{{ toggleLabel }}</button>
    <h4 class="mt-7 text-sm font-semibold">{{ messages.explanation.references }}</h4>
    <p class="mt-1 text-sm text-slate-600">{{ messages.explanation.referenceHint }}</p>
    <ul class="mt-2 space-y-1">
      <li v-for="(reference, index) in question.references" :key="index">
        <code class="select-text break-all text-sm">{{ messages.explanation.location(reference.path, reference.line) }}</code>
      </li>
    </ul>
    <QuestionDiagram v-if="question.diagram" :key="question.diagram.source" :source="question.diagram.source" />
  </section>
</template>

<style scoped>
.explanation-panel { margin-top: 2rem; padding: 1.5rem 0 0 1.5rem; border-left: 2px solid #c6d3bd; }
@media (min-width: 1280px) { .explanation-panel { margin-top: 0; padding-top: 0; } }
</style>
