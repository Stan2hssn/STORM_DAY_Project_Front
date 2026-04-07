<template>
  <button
    class="flex w-full items-stretch gap-3 rounded-md px-3 py-3 text-left transition"
    :class="[!active && 'conversation-item-hover', active && 'conversation-item-active']"
    :aria-current="active ? 'true' : undefined"
    :aria-label="`${conversation.name}${conversation.unread ? `, ${conversation.unread} unread` : ''}`"
    @click="$emit('select', conversation.id)"
  >
    <BaseAvatar :text="initials" size="md" class="h-full" aria-hidden="true" />

    <div class="min-w-0 flex-1 flex flex-col justify-center">
      <p class="truncate text-[1.05rem] font-medium" style="color: var(--chat-text)">
        {{ conversation.name }}
      </p>
      <p class="truncate text-sm" style="color: var(--chat-text-secondary)">
        {{ conversation.preview }}
      </p>
    </div>

    <div class="flex shrink-0 flex-col items-end justify-center gap-1">
      <span class="text-xs" style="color: var(--chat-text-secondary)" aria-hidden="true">{{ conversation.time }}</span>
      <UBadge v-if="conversation.unread" size="sm" color="primary" variant="soft">
        <span class="sr-only">{{ conversation.unread }} unread messages</span>
        <span aria-hidden="true">{{ conversation.unread }}</span>
      </UBadge>
    </div>
  </button>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue';
import type { Conversation } from '@/types/chat';
import { computed } from 'vue';

const props = defineProps<{
  conversation: Conversation
  active: boolean
}>()

defineEmits<{ select: [conversationId: string] }>()

const initials = computed(() => props.conversation.name.slice(0, 2).toUpperCase())
</script>

<style scoped>
.conversation-item-hover:hover {
  background-color: var(--chat-surface-hover);
}

.conversation-item-active {
  border: 1px solid var(--chat-border);
  background-color: color-mix(in srgb, var(--chat-accent) 14%, transparent);
}
</style>
