<script setup lang="ts">
import { messages } from '../locales/en';

defineProps<{ correct: number; total: number; percentage: number }>();
const emit = defineEmits<{ retake: [] }>();
</script>

<template>
  <section class="mt-7 border-y border-zinc-300 py-5" :aria-label="messages.quiz.resultLabel" aria-live="polite">
    <h3 class="text-xl font-semibold tracking-tight">{{ messages.quiz.score(correct, total, percentage) }}</h3>
    <p class="mt-2 text-sm leading-6 text-slate-600">{{ correct === total ? messages.quiz.perfect : messages.quiz.reviewHint }}</p>
    <button type="button" class="primary-button mt-4 w-full" @click="emit('retake')">
      {{ messages.quiz.retake }}
    </button>
  </section>
</template>
