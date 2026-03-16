<template>
  <section class="flex min-w-0 flex-1 flex-col bg-[#0b141a]">
    <header class="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
      <div class="flex items-center gap-3">
        <BaseAvatar :text="chatAvatar" size="lg" />
        <div>
          <p class="text-xl font-medium text-[#e9edef]">
            {{ chatName }}
          </p>
          <p class="text-xs text-[#8696a0]">
            {{ subtitle }} - {{ membersLabel }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <IconGhostButton icon="i-lucide-users" @click="emit('openMembers')" />
        <IconGhostButton icon="i-lucide-ellipsis-vertical" />
      </div>
    </header>

    <div class="chat-scroll chat-thread-bg flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
      <DateDivider />

      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />

      <p class="mx-auto max-w-5xl text-center text-sm text-[#8696a0]">
        {{ systemMessage }}
      </p>
    </div>

    <ChatComposer @send="(text) => emit('send', text)" />
  </section>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import IconGhostButton from '@/components/atoms/IconGhostButton.vue'
import ChatComposer from '@/components/molecules/ChatComposer.vue'
import DateDivider from '@/components/molecules/DateDivider.vue'
import MessageBubble from '@/components/molecules/MessageBubble.vue'
import type { Message } from '@/types/chat'

withDefaults(defineProps<{
  messages: Message[]
  chatName: string
  chatAvatar: string
  membersLabel: string
  systemMessage: string
  subtitle?: string
}>(), {
  subtitle: 'Encrypted conversation'
})

const emit = defineEmits<{
  send: [text: string]
  openMembers: []
}>()
</script>