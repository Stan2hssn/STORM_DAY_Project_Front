<template>
  <button
    class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition"
    :class="conversation.active ? 'bg-[#202c33]' : 'hover:bg-[#1a262e]'"
    @click="$emit('select', conversation.id)"
  >
    <BaseAvatar :text="initials" size="sm" />

    <div class="min-w-0 flex-1">
      <p class="truncate text-[1.05rem] font-medium text-[#e9edef]">
        {{ conversation.name }}
      </p>
      <p class="truncate text-sm text-[#8696a0]">
        {{ conversation.preview }}
      </p>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-1">
      <span class="text-xs text-[#8696a0]">{{ conversation.time }}</span>
      <UBadge v-if="conversation.unread" size="sm" color="primary" variant="soft">
        {{ conversation.unread }}
      </UBadge>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import type { Conversation } from '@/types/chat'

const props = defineProps<{
  conversation: Conversation
}>()

defineEmits<{
  select: [conversationId: string]
}>()

const initials = computed(() => props.conversation.name.slice(0, 2).toUpperCase())
</script>