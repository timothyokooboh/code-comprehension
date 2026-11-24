<script setup lang="ts">
import { messages } from '../locales/en';

defineProps<{ correct: number; total: number; percentage: number; hasWritten?: boolean; retaking?: boolean }>();
const emit = defineEmits<{ retake: [] }>();
</script>

<template>
  <section class="mt-7 border-y border-zinc-300 py-5" :aria-label="messages.quiz.resultLabel" aria-live="polite">
    <h3 v-if="total > 0" class="text-xl font-semibold tracking-tight">{{ (hasWritten ? messages.written.mcqScore : messages.quiz.score)(correct, total, percentage) }}</h3>
    <p v-if="!hasWritten" class="mt-2 text-sm leading-6 text-slate-600">{{ correct === total ? messages.quiz.perfect : messages.quiz.reviewHint }}</p>
    <p v-else class="mt-2 text-sm leading-6">{{ messages.written.resultHint }}</p>
    <button :disabled="retaking" type="button" class="primary-button mt-4 w-full" @click="emit('retake')">
      {{ messages.quiz.retake }}
    </button>
  </section>
</template>
