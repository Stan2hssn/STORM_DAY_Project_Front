<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style="background-color: var(--chat-modal-overlay)"
      aria-modal="true"
      role="dialog"
      aria-label="Forward to conversation"
      @click.self="$emit('cancel')"
    >
      <div
        class="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border shadow-xl"
        :style="{
          backgroundColor: 'var(--chat-surface)',
          borderColor: 'var(--chat-border)',
          boxShadow: '0 24px 64px var(--chat-shell-shadow)',
        }"
        @click.stop
      >
        <div class="border-b px-4 py-4" :style="{ borderColor: 'var(--chat-border)' }">
          <div class="flex items-center gap-2">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style="background-color: var(--chat-forward-quote-bg); color: var(--chat-text-secondary)"
            >
              <UIcon name="i-lucide-forward" class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold leading-tight" style="color: var(--chat-text)">
                Forward to…
              </h3>
              <p class="mt-0.5 text-xs italic" style="color: var(--chat-text-muted)">
                Choose a conversation
              </p>
            </div>
          </div>
          <div class="mt-3">
            <div class="mb-1 flex items-center gap-1.5">
              <UIcon
                name="i-lucide-forward"
                class="size-3.5 shrink-0 opacity-90"
                style="color: var(--chat-text-secondary)"
              />
              <span class="text-[0.75rem] italic leading-none" style="color: var(--chat-text-secondary)">
                Transféré
              </span>
            </div>
            <p
              class="line-clamp-4 whitespace-pre-wrap wrap-break-word text-[0.9375rem] leading-snug"
              style="color: var(--chat-text)"
            >
              {{ messagePreview }}
            </p>
          </div>
        </div>
        <div class="max-h-96 overflow-y-auto p-2 chat-scroll">
          <button
            v-for="conv in targetConversations"
            :key="conv.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:bg-[var(--chat-surface-hover)]"
            :style="{
              color: 'var(--chat-text)',
            }"
            :aria-label="`Forward to ${conv.name}`"
            @click="$emit('forward', conv.id)"
          >
            <BaseAvatar :text="conv.name.slice(0, 2).toUpperCase()" size="sm" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ conv.name }}</p>
              <p class="truncate text-sm" style="color: var(--chat-text-secondary)">
                {{ conv.preview }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 opacity-40" />
          </button>
          <p
            v-if="!targetConversations.length"
            class="py-6 text-center text-sm"
            style="color: var(--chat-text-secondary)"
          >
            No other conversation to forward to.
          </p>
        </div>
        <div class="border-t" :style="{ borderColor: 'var(--chat-border)' }">
          <UButton color="neutral" variant="ghost" class="p-3 rounded-none" block @click="$emit('cancel')">
            Cancel
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue';
import type { Conversation } from '@/types/chat';
import { computed } from 'vue';

const props = defineProps<{
  messagePreview: string
  conversations: Conversation[]
  activeConversationId: string | null
}>()

defineEmits<{
  forward: [conversationId: string]
  cancel: []
}>()

const targetConversations = computed(() =>
  props.conversations.filter((c) => c.id !== props.activeConversationId),
)
</script>
