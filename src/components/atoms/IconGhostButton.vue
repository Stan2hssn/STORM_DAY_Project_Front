<template>
  <UButton
    :icon="icon"
    color="neutral"
    variant="ghost"
    :aria-label="label"
    :ui="{ base: 'text-[var(--chat-icon)] hover:bg-[var(--chat-icon-hover)]' }"
  />
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label?: string
}>()
</script>
