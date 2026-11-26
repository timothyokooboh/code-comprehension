<script setup lang="ts">
import { explainerRoute } from '@code-comprehension/quiz-contract';
import ExplainerSession from './components/ExplainerSession.vue';
const isExplainer = window.location.pathname === explainerRoute;
import QuizSession from './components/QuizSession.vue';
import RuntimeConnection from './components/RuntimeConnection.vue';
import { messages } from './locales/en';
</script>

<template>
  <main class="mx-auto min-h-screen max-w-[1800px]">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-300 bg-white px-6 py-5 lg:px-9">
      <div class="flex items-center gap-3">
        <span aria-hidden="true" class="brand-mark">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M3 3h9v9H3zM14 14h9v9h-9z" fill="currentColor" />
            <path d="m15 6 3 3 5-6M3 19h8" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">{{ messages.app.title }}</h1>
          <p class="text-xs text-slate-500">{{ messages.app.tagline }}</p>
        </div>
      </div>
      <RuntimeConnection />
    </header>
    <ExplainerSession v-if="isExplainer" />
    <QuizSession v-else />
  </main>
</template>

<style scoped>
.brand-mark { display: grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; background: var(--accent); border: 1px solid var(--ink); border-radius: 4px; box-shadow: 3px 3px 0 var(--ink); transform: rotate(-3deg); }
</style>
