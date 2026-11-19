<script setup lang="ts">
import { messages } from '../locales/en';

defineProps<{ correct: number; total: number; percentage: number }>();
const emit = defineEmits<{ retake: [] }>();
</script>

<template>
  <section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" :aria-label="messages.quiz.resultLabel" aria-live="polite">
    <h3 class="text-xl font-semibold">{{ messages.quiz.score(correct, total, percentage) }}</h3>
    <p class="mt-2 text-slate-600">{{ correct === total ? messages.quiz.perfect : messages.quiz.reviewHint }}</p>
    <button type="button" class="mt-4 rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4" @click="emit('retake')">
      {{ messages.quiz.retake }}
    </button>
  </section>
</template>
