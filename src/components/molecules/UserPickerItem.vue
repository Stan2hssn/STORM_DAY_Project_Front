<template>
  <button
    class="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition user-picker-item"
    :class="selected ? 'user-picker-selected' : 'user-picker-default'"
    :aria-pressed="selected"
    :aria-label="`${user.displayName} (@${user.username})${selected ? ', selected' : ''}`"
    @click="$emit('toggle')"
  >
    <BaseAvatar :text="initials" size="sm" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium" :style="{ color: 'var(--chat-text)' }">
        {{ user.displayName }}
      </p>
      <p class="truncate text-xs" :style="{ color: 'var(--chat-text-muted)' }">
        @{{ user.username }}
      </p>
    </div>
    <UIcon
      :name="selected ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
      class="h-4 w-4"
      :style="{ color: selected ? 'var(--chat-accent)' : 'var(--chat-text-muted)' }"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import type { ChatUser } from '@/types/chat'

const props = defineProps<{
  user: ChatUser
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()

const initials = computed(() => props.user.displayName.slice(0, 2).toUpperCase())
</script>

<style scoped>
.user-picker-selected {
  border-color: color-mix(in srgb, var(--chat-accent) 60%, transparent);
  background-color: color-mix(in srgb, var(--chat-accent) 14%, transparent);
}
.user-picker-default {
  border-color: var(--chat-border);
  background-color: var(--chat-surface);
}
.user-picker-default:hover {
  background-color: var(--chat-surface-hover);
}
</style>
