<template>
  <ChatLayoutTemplate
    :conversations="conversations"
    :active-conversation="activeConversation"
    :messages="activeMessages"
    :member-rail="memberRail"
    :accounts="accounts"
    :current-account-id="activeAccountId"
    :users="directoryUsers"
    :chat-name="chatName"
    :chat-avatar="chatAvatar"
    :members-label="membersLabel"
    :system-message="systemMessage"
    :typing-label="typingLabel"
    :subtitle="subtitle"
    @select-conversation="setActiveConversation"
    @switch-account="setActiveAccount"
    @create-conversation="createConversation"
    @send-message="(text, att) => sendMessage(text, att)"
    @typing="sendTyping(activeConversation?.id ?? '')"
    @leave-conversation="leaveConversation"
  />
</template>

<script setup lang="ts">
import ChatLayoutTemplate from '@/components/templates/ChatLayoutTemplate.vue'
import { useChatWorkspace } from '@/composables/useChatWorkspace'
import { computed } from 'vue'

const {
  accounts,
  activeAccount,
  activeAccountId,
  activeConversation,
  activeMessages,
  conversations,
  createConversation,
  leaveConversation,
  directoryUsers,
  memberRail,
  membersLabel,
  sendMessage,
  sendTyping,
  setActiveAccount,
  setActiveConversation,
  systemMessage,
  typingLabel,
} = useChatWorkspace()

const chatName = computed(() => activeConversation.value?.name ?? 'New conversation')
const chatAvatar = computed(() => chatName.value.slice(0, 2).toUpperCase())
const subtitle = computed(() => activeAccount.value?.role ?? 'Account')
</script>
