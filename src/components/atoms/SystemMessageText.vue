<template>
  <p class="mx-auto max-w-5xl text-center text-sm" style="color: var(--chat-text-secondary)">
    <span class="sr-only">System message:</span>
    {{ message }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>
