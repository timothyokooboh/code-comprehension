<script setup lang="ts">
import { computed, useId } from 'vue';
import { questionTypes, type Question } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';
import QuestionExplanation from './QuestionExplanation.vue';

const props = defineProps<{
  question: Question;
  number: number;
  selected: readonly string[];
  submitted: boolean;
}>();
const emit = defineEmits<{ answer: [selection: string[]] }>();
const inputName = useId();
const inputType = computed(() => props.question.type === questionTypes.single ? 'radio' : 'checkbox');
const instruction = computed(() => messages.quiz.instructions[props.question.type]);
const correctAnswers = computed(() => props.question.options
  .filter((option) => props.question.correctOptionIds.includes(option.id)).map((option) => option.text));

const options = computed(() => props.question.options.map((option) => {
  const selected = props.selected.includes(option.id);
  const correct = props.question.correctOptionIds.includes(option.id);
  const incorrect = props.submitted && selected && !correct;
  const highlighted = props.submitted ? correct : selected;
  let feedback = '';
  if (props.submitted && correct) {
    feedback = selected ? messages.quiz.correctSelected : messages.quiz.correctMissed;
  } else if (incorrect) {
    feedback = messages.quiz.incorrectSelected;
  }
  return {
    ...option,
    selected,
    feedback,
    classes: {
      'cursor-pointer': !props.submitted,
      'border-slate-200': !highlighted && !incorrect,
      'border-emerald-700 bg-emerald-50': highlighted,
      'border-red-700 bg-red-50': incorrect,
    },
  };
}));

function select(optionId: string) {
  if (props.submitted) return;
  const selection = props.question.type === questionTypes.single ? [optionId]
    : props.selected.includes(optionId) ? props.selected.filter((id) => id !== optionId)
      : [...props.selected, optionId];
  emit('answer', selection);
}
</script>

<template>
  <div tabindex="-1" class="question-row" :class="{ 'is-review': submitted }">
    <fieldset :style="{ viewTransitionName: `quiz-answers-${inputName}` }" class="min-w-0" :disabled="submitted" :aria-describedby="`${inputName}-hint`">
      <legend class="mb-4 text-2xl font-semibold leading-snug tracking-tight">{{ messages.quiz.question(number, question.prompt) }}</legend>
      <p :id="`${inputName}-hint`" class="mb-6 text-xs font-semibold uppercase tracking-wider text-slate-500">{{ instruction }}</p>
      <div class="answer-options">
        <label v-for="option in options" :key="option.id" :class="option.classes" class="answer-option flex items-start gap-3 rounded-lg border p-4">
          <input
            :type="inputType" :name="inputName" :value="option.id"
            :checked="option.selected" class="mt-1 accent-emerald-700"
            @change="select(option.id)"
          />
          <span>
            <span class="block">{{ option.text }}</span>
            <span v-if="option.feedback" class="mt-1 block text-sm font-semibold">{{ option.feedback }}</span>
          </span>
        </label>
      </div>
      <p v-if="submitted" class="mt-4 font-medium text-emerald-800">{{ messages.quiz.correctAnswers(correctAnswers) }}</p>
    </fieldset>
    <QuestionExplanation v-if="submitted" :key="question.id" :question="question" :number="number" />
  </div>
</template>

<style scoped>
.question-row { display: grid; grid-template-columns: minmax(0, 1fr); padding: 2rem 0; border-bottom: 1px solid #d8dfd7; scroll-margin-top: 2rem; }
.answer-options { display: grid; gap: .75rem; }
.answer-option { min-width: 0; }
@media (hover: hover) and (pointer: fine) { fieldset:not(:disabled) .answer-option:hover { border-color: #174f42; } }
@media (min-width: 1280px) {
  .is-review { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 3rem; }
  .is-review .answer-options { grid-template-columns: minmax(0, 1fr); }
}
</style>
