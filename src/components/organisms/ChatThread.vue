<template>
  <section class="relative flex min-w-0 flex-1 flex-col bg-[#0b141a]">
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
        <IconGhostButton icon="i-lucide-info" @click="infoOpen = !infoOpen" />
        <IconGhostButton icon="i-lucide-search" />
      </div>
    </header>

    <div ref="threadEl" class="chat-scroll chat-thread-bg flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
      <DateDivider />

      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />

      <p class="mx-auto max-w-5xl text-center text-sm text-[#8696a0]">
        {{ systemMessage }}
      </p>

      <p v-if="typingLabel" class="text-xs italic text-[#8696a0] px-1">
        {{ typingLabel }}
      </p>
    </div>

    <ChatComposer @send="(text, att) => emit('send', text, att)" @typing="emit('typing')" />

    <ConversationInfoPanel
      :open="infoOpen"
      :conversation="conversation"
      @close="infoOpen = false"
      @leave="emit('leave')"
    />
  </section>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import IconGhostButton from '@/components/atoms/IconGhostButton.vue'
import ChatComposer from '@/components/molecules/ChatComposer.vue'
import DateDivider from '@/components/molecules/DateDivider.vue'
import MessageBubble from '@/components/molecules/MessageBubble.vue'
import ConversationInfoPanel from '@/components/organisms/ConversationInfoPanel.vue'
import type { Conversation, Message } from '@/types/chat'
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  messages: Message[]
  conversation: Conversation | null
  chatName: string
  chatAvatar: string
  membersLabel: string
  systemMessage: string
  typingLabel?: string
  subtitle?: string
}>(), {
  subtitle: 'Encrypted conversation',
  typingLabel: '',
})

const emit = defineEmits<{
  send: [text: string, attachment?: string]
  typing: []
  leave: []
}>()

const infoOpen = ref(false)
const threadEl = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.typingLabel, scrollToBottom)
</script>
