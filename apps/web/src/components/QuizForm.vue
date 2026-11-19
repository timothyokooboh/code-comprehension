<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue';
import type { Quiz } from '@code-comprehension/quiz-contract';
import { useQuizAttempt } from '../composables/useQuizAttempt';
import { messages } from '../locales/en';
import QuizQuestion from './QuizQuestion.vue';
import QuizResult from './QuizResult.vue';

const props = defineProps<{ quiz: Quiz }>();
const { answers, result, canSubmit, answer, submit, retake } = useQuizAttempt(props.quiz);
const heading = useTemplateRef('heading');

async function restart() {
  retake();
  await nextTick();
  heading.value?.focus();
}
</script>

<template>
  <section :aria-label="messages.assessment.label" class="mt-10">
    <h2 ref="heading" tabindex="-1" class="text-2xl font-semibold">{{ quiz.title }}</h2>
    <p class="mt-2 text-slate-600">{{ messages.quiz.scope(quiz.scope) }}</p>
    <form class="mt-6 space-y-6" @submit.prevent="submit">
      <QuizQuestion
        v-for="(question, index) in quiz.questions" :key="question.id"
        :question="question" :number="index + 1" :selected="answers.get(question.id) ?? []"
        :submitted="result !== null" @answer="answer(question.id, $event)"
      />
      <template v-if="!result">
        <p class="text-sm text-slate-600">{{ messages.quiz.submitHint }}</p>
        <button :disabled="!canSubmit" type="submit" class="rounded-lg bg-emerald-800 enabled:cursor-pointer enabled:hover:bg-emerald-900 disabled:cursor-not-allowed px-5 py-3 font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4">
          {{ messages.quiz.submit }}
        </button>
      </template>
    </form>
    <div v-if="result" class="mt-6">
      <QuizResult :correct="result.correct" :total="result.total" :percentage="result.percentage" @retake="restart" />
    </div>
  </section>
</template>
