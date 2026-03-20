<template>
  <div
    class="relative mb-2.5 min-w-0 w-full cursor-pointer flex flex-col gap-1 overflow-hidden py-1 pl-3 pr-2 text-left transition-opacity after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-[var(--chat-accent)] hover:opacity-95"
    role="button"
    tabindex="0"
    :style="{
      backgroundColor: 'var(--chat-reply-quote-bg)',
      borderRadius: 'max(0.65rem, calc(var(--chat-bubble-radius) - calc(var(--spacing) * 3)))',
    }"
    :aria-label="`En réponse à ${replyTo.author}: ${replyTo.text}`"
    @click="$emit('click')"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <p class="text-[0.8125rem]" style="color: var(--chat-text-secondary)">
      {{ replyTo.author }}
    </p>
    <p
      class="line-clamp-3 whitespace-pre-wrap wrap-break-word text-[0.8125rem] leading-snug"
      style="color: var(--chat-text-muted)"
    >
      {{ replyTo.text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ReplyTo } from '@/types/chat';

defineProps<{
  replyTo: ReplyTo
  isRight?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>
