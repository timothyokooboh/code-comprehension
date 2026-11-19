<script setup lang="ts">
import QuizSession from './components/QuizSession.vue';
import RuntimeConnection from './components/RuntimeConnection.vue';
import { messages } from './locales/en';
</script>

<template>
  <main class="mx-auto min-h-screen max-w-[1800px]">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-950/15 bg-white px-6 py-5 lg:px-9">
      <div class="flex items-center gap-3">
        <span aria-hidden="true" class="grid size-10 place-items-center rounded-lg bg-emerald-950 font-mono text-lg text-lime-200">{ }</span>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">{{ messages.app.title }}</h1>
          <p class="text-xs text-slate-500">{{ messages.app.tagline }}</p>
        </div>
      </div>
      <RuntimeConnection />
    </header>
    <QuizSession />
  </main>
</template>
