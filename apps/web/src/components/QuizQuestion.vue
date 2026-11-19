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
  <div>
    <fieldset class="rounded-2xl border border-slate-200 bg-white p-6" :disabled="submitted" :aria-describedby="`${inputName}-hint`">
      <legend class="px-2 text-lg font-semibold">{{ messages.quiz.question(number, question.prompt) }}</legend>
      <p :id="`${inputName}-hint`" class="mb-4 text-sm text-slate-600">{{ instruction }}</p>
      <div class="space-y-3">
        <label v-for="option in options" :key="option.id" :class="option.classes" class="flex items-start gap-3 rounded-lg border p-3">
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
