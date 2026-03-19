<template>
  <div class="mx-auto flex w-full max-w-2xl items-center gap-4 text-xs" style="color: var(--chat-text-muted)">
    <hr class="h-px flex-1 border-0" style="background-color: var(--chat-border)" aria-hidden="true">
    <span>{{ label }}</span>
    <hr class="h-px flex-1 border-0" style="background-color: var(--chat-border)" aria-hidden="true">
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Today'
})
</script>
