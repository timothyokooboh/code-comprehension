<script setup lang="ts">
import type { PrComparison } from '@code-comprehension/quiz-contract';
import { messages } from '../locales/en';

defineProps<{ comparison: PrComparison }>();
</script>

<template>
  <section :aria-label="messages.prComparison.label" class="mt-5 border-y border-zinc-300 py-4">
    <h3 class="eyebrow">{{ messages.prComparison.label }}</h3>
    <dl class="mt-3 space-y-3 text-xs">
      <div><dt class="text-zinc-500">{{ messages.prComparison.target }}</dt><dd class="mt-1 break-all font-mono">{{ comparison.target }}</dd></div>
      <div><dt class="text-zinc-500">{{ messages.prComparison.baseline }}</dt><dd class="mt-1 break-all font-mono">{{ comparison.baseline }}</dd></div>
      <div><dt class="text-zinc-500">{{ messages.prComparison.uncommitted }}</dt><dd class="mt-1">{{ comparison.includesUncommitted ? messages.prComparison.included : messages.prComparison.none }}</dd></div>
    </dl>
  </section>
</template>
