<template>
  <UApp>
    <ChatLayoutTemplate
      :conversations="conversations"
      :messages="activeMessages"
      :member-rail="memberRail"
      :accounts="accounts"
      :current-account-id="activeAccountId"
      :users="directoryUsers"
      :chat-name="chatName"
      :chat-avatar="chatAvatar"
      :members-label="membersLabel"
      :system-message="systemMessage"
      :subtitle="subtitle"
      @select-conversation="setActiveConversation"
      @switch-account="setActiveAccount"
      @create-conversation="createConversation"
      @send-message="sendMessage"
    />
  </UApp>
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
  directoryUsers,
  memberRail,
  membersLabel,
  sendMessage,
  setActiveAccount,
  setActiveConversation,
  systemMessage
} = useChatWorkspace()

const chatName = computed(() => activeConversation.value?.name ?? 'New conversation')
const chatAvatar = computed(() => chatName.value.slice(0, 2).toUpperCase())
const subtitle = computed(() => activeAccount.value?.role ?? 'Account')
</script>