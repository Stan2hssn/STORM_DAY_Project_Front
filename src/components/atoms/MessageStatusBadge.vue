<template>
  <p class="mt-0.5 flex items-center justify-end gap-1 text-[0.65rem]" aria-hidden="true">
    <span style="color: var(--chat-text-secondary)">{{ time }}</span>
    <template v-if="status !== null && status !== undefined">
      <UIcon
        v-if="statusIcon"
        :name="statusIcon"
        class="size-3 shrink-0"
        :style="{ color: statusColor }"
      />
      <span v-if="statusLabel" :style="{ color: statusColor }">{{ statusLabel }}</span>
    </template>
  </p>
</template>

<script setup lang="ts">
import type { MessageStatus } from '@/types/chat'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  time: string
  status?: MessageStatus | null
}>(), {
  status: null,
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'sending': return 'i-lucide-loader-2'
    case 'sent': return 'i-lucide-check'
    case 'delivered':
    case 'seen': return 'i-lucide-check-check'
    default: return null
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'sending': return '…'
    case 'sent': return 'sent'
    case 'delivered': return 'delivered'
    case 'seen': return 'seen'
    default: return null
  }
})

const statusColor = computed(() =>
  props.status === 'seen' ? 'var(--chat-accent)' : 'var(--chat-text-secondary)',
)
</script>
