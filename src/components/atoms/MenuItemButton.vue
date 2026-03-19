<template>
  <button
    type="button"
    class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors"
    style="color: var(--chat-text)"
    role="menuitem"
    @click="$emit('click')"
  >
    <UIcon
      :name="icon"
      class="size-4 shrink-0 opacity-90"
      style="color: var(--chat-text-secondary)"
      aria-hidden="true"
    />
    <span class="font-medium">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label: string
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
button:hover {
  background-color: color-mix(in srgb, var(--chat-text) 6%, transparent);
}
</style>
