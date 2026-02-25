<template>
  <div class="mx-auto flex w-full max-w-2xl items-center gap-4 text-xs text-slate-500">
    <div class="h-px flex-1 bg-white/10" />
    <span>{{ label }}</span>
    <div class="h-px flex-1 bg-white/10" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Today'
})
</script>