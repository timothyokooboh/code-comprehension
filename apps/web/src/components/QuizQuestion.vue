<script setup lang="ts">
import { computed, useId } from 'vue';
import { questionTypes, type Question } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';

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

function select(optionId: string) {
  if (props.submitted) return;
  const selection = props.question.type === questionTypes.single ? [optionId]
    : props.selected.includes(optionId) ? props.selected.filter((id) => id !== optionId)
      : [...props.selected, optionId];
  emit('answer', selection);
}
</script>

<template>
  <fieldset class="rounded-2xl border border-slate-200 bg-white p-6" :disabled="submitted" :aria-describedby="`${inputName}-hint`">
    <legend class="px-2 text-lg font-semibold">{{ messages.quiz.question(number, question.prompt) }}</legend>
    <p :id="`${inputName}-hint`" class="mb-4 text-sm text-slate-600">{{ instruction }}</p>
    <div class="space-y-3">
      <label v-for="option in question.options" :key="option.id" class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-checked:border-emerald-700 has-checked:bg-emerald-50">
        <input
          :type="inputType" :name="inputName" :value="option.id"
          :checked="selected.includes(option.id)" class="mt-1 accent-emerald-700"
          @change="select(option.id)"
        />
        <span>{{ option.text }}</span>
      </label>
    </div>
    <p v-if="submitted" class="mt-4 font-medium text-emerald-800">{{ messages.quiz.correctAnswers(correctAnswers) }}</p>
  </fieldset>
</template>
