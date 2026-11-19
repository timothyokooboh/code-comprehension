<script setup lang="ts">
import { useQuizLoader, quizLoadStates } from '../composables/useQuizLoader';
import { messages } from '../locales/en';
import QuizForm from './QuizForm.vue';

const { state } = useQuizLoader();
</script>

<template>
  <p v-if="state.status === quizLoadStates.loading" class="mt-10" role="status">{{ messages.quiz.loading }}</p>
  <p v-else-if="state.status === quizLoadStates.failed" class="mt-10" role="alert">{{ messages.quiz.errors[state.errorCode] }}</p>
  <template v-else>
    <QuizForm v-if="state.quiz" :quiz="state.quiz" />
    <section v-else class="mt-10 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm" :aria-label="messages.assessment.label">
      <h2 class="text-lg font-semibold">{{ messages.assessment.emptyTitle }}</h2>
      <p class="mt-2 leading-7 text-slate-600">{{ messages.assessment.emptyDescription }}</p>
    </section>
  </template>
</template>
