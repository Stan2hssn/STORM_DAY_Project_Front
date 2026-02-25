<template>
  <div class="relative h-screen overflow-hidden p-2 sm:p-4">
    <div class="pointer-events-none absolute inset-0 wa-scene-blur" />
    <div class="pointer-events-none absolute inset-0 codex-grid opacity-20" />

    <main class="relative mx-auto flex h-full w-full max-w-[1680px] overflow-hidden border border-white/10 chat-shell">
      <ChatSidebar
        :conversations="conversations"
        :accounts="accounts"
        :current-account-id="currentAccountId"
        :users="users"
        @select-conversation="(id) => emit('selectConversation', id)"
        @switch-account="(id) => emit('switchAccount', id)"
        @create-conversation="(payload) => emit('createConversation', payload)"
      />

      <ChatThread
        :messages="messages"
        :chat-name="chatName"
        :chat-avatar="chatAvatar"
        :members-label="membersLabel"
        :system-message="systemMessage"
        :subtitle="subtitle"
        @send="(text) => emit('sendMessage', text)"
      />

      <ChatMembersRail :members="memberRail" />
    </main>
  </div>
</template>

<script setup lang="ts">
import ChatMembersRail from '@/components/organisms/ChatMembersRail.vue'
import ChatSidebar from '@/components/organisms/ChatSidebar.vue'
import ChatThread from '@/components/organisms/ChatThread.vue'
import type {
  Account,
  Conversation,
  CreateConversationPayload,
  DirectoryUser,
  Message
} from '@/types/chat'

defineProps<{
  conversations: Conversation[]
  messages: Message[]
  memberRail: string[]
  accounts: Account[]
  currentAccountId: string
  users: DirectoryUser[]
  chatName: string
  chatAvatar: string
  membersLabel: string
  systemMessage: string
  subtitle?: string
}>()

const emit = defineEmits<{
  selectConversation: [conversationId: string]
  switchAccount: [accountId: string]
  createConversation: [payload: CreateConversationPayload]
  sendMessage: [text: string]
}>()
</script>