<script setup lang="ts">
import QuizSession from './components/QuizSession.vue';
import RuntimeConnection from './components/RuntimeConnection.vue';
import { messages } from './locales/en';
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
    <p class="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{{ messages.app.tagline }}</p>
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">{{ messages.app.title }}</h1>
    <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">{{ messages.app.introduction }}</p>
    <RuntimeConnection />
    <QuizSession />
  </main>
</template>
