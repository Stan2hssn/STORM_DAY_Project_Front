<template>
  <div
    class="flex items-stretch gap-2 px-3 py-3"
    :style="{
      backgroundColor: 'var(--chat-composer)',
      borderBottom: '1px solid var(--chat-border)',
    }"
  >
    <div
      class="relative min-w-0 flex w-full flex-col gap-1 overflow-hidden py-1 pl-3 pr-1 after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-[var(--chat-accent)] after:content-['']"
      :style="{
        backgroundColor: 'var(--chat-reply-quote-bg)',
        borderRadius: 'max(0.65rem, calc(var(--chat-bubble-radius) - 6px))',
      }"
    >
      <p class="text-[0.8125rem]" style="color: var(--chat-text-secondary)">
        {{ replyTo.author }}
      </p>
      <p
        class="line-clamp-2 whitespace-pre-wrap wrap-break-word text-[0.8125rem]"
        style="color: var(--chat-text-muted)"
      >
        {{ replyTo.text }}
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 self-start rounded-full p-1"
      :style="{ color: 'var(--chat-text-secondary)' }"
      aria-label="Cancel reply"
      @click="$emit('cancel')"
    >
      <UIcon name="i-lucide-x" class="size-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ReplyTo } from '@/types/chat';

defineProps<{
  replyTo: ReplyTo
}>()

defineEmits<{
  cancel: []
}>()
</script>
