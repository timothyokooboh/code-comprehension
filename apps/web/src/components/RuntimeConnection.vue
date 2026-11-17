<script setup lang="ts">
import { computed } from 'vue';
import { useRuntimeConnection } from '../composables/useRuntimeConnection';
import { messages } from '../locales/en';

const { state } = useRuntimeConnection();
const message = computed(() => messages.connection[state.value]);
const role = computed(() => state.value === 'unavailable' ? 'alert' : 'status');
</script>

<template>
  <p class="mt-6 text-sm text-emerald-800" :role="role">{{ message }}</p>
</template>
