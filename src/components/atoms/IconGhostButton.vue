<template>
  <UButton
    :icon="icon"
    color="neutral"
    variant="ghost"
    size="md"
    class="size-11 shrink-0 justify-center"
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
