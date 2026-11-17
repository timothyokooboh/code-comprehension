<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';
import { applicationName, type RuntimeStatus } from '@code-comprehension/quiz-contract';

const connection = shallowRef('Connecting locally…');
const connectionError = shallowRef(false);

onMounted(async () => {
  try {
    const response = await fetch('/api/status', { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error('Local server unavailable');
    const runtime: RuntimeStatus = await response.json();
    if (runtime.status !== 'ready') throw new Error('Local server not ready');
    connection.value = 'Connected locally';
  } catch {
    connectionError.value = true;
    connection.value = 'Unable to connect. Restart the CLI and reload this page.';
  }
});
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
    <p class="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Understand what you ship</p>
    <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">{{ applicationName }}</h1>
    <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
      A space to understand your changes and the systems you build.
    </p>
    <p class="mt-6 text-sm text-emerald-800" :role="connectionError ? 'alert' : 'status'">{{ connection }}</p>
    <section class="mt-10 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm" aria-label="Quiz session">
      <h2 class="text-lg font-semibold">No assessment loaded</h2>
      <p class="mt-2 leading-7 text-slate-600">Your quiz will appear here when an assessment is available.</p>
    </section>
  </main>
</template>
