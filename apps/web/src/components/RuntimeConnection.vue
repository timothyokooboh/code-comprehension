<script setup lang="ts">
import { computed } from 'vue';
import { connectionStates, useRuntimeConnection } from '../composables/useRuntimeConnection';
import { messages } from '../locales/en';

const { state } = useRuntimeConnection();
const message = computed(() => state.value.status === connectionStates.failed
  ? messages.connection.errors[state.value.errorCode]
  : messages.connection[state.value.status]);
const role = computed(() => state.value.status === connectionStates.failed ? 'alert' : 'status');
</script>

<template>
  <p class="text-xs font-medium text-emerald-800" :role="role">{{ message }}</p>
</template>
