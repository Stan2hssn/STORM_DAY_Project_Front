<template>
  <div
    class="px-4 py-1 text-xs"
    style="color: var(--chat-text-secondary)"
  >
    <span class="typing-dots">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  users: string[]
}>()

const label = computed(() => {
  const u = props.users
  if (u.length === 1) return `${u[0]} is typing…`
  if (u.length === 2) return `${u[0]} and ${u[1]} are typing…`
  return `${u[0]} and ${u.length - 1} others are typing…`
})
</script>

<style scoped>
.typing-dots::after {
  content: '';
  animation: dots 1.4s steps(4, end) infinite;
}

@keyframes dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}
</style>
