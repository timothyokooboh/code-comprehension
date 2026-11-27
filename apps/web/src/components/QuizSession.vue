<script setup lang="ts">
import { useQuizLoader, quizLoadStates } from '../composables/useQuizLoader';
import { messages } from '../locales/en';
import QuizForm from './QuizForm.vue';
import AssessmentEmptyState from './AssessmentEmptyState.vue';

const { state } = useQuizLoader();
</script>

<template>
  <p v-if="state.status === quizLoadStates.loading" class="mt-10" role="status">{{ messages.quiz.loading }}</p>
  <AssessmentEmptyState v-else-if="state.status === quizLoadStates.failed" :error-code="state.errorCode" />
  <template v-else>
    <QuizForm v-if="state.quiz" :quiz="state.quiz" />
    <AssessmentEmptyState v-else />
  </template>
</template>
