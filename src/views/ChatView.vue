<template>
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
    @open-members="membersOpen = true"
  />

  <GroupMembersPanel
    :open="membersOpen"
    :conversation-id="activeConversation?.id ?? ''"
    :current-user-id="auth.user?.id ?? ''"
    :group-name="activeConversation?.name ?? ''"
    @close="membersOpen = false"
    @member-removed="(id) => removeMember(activeConversation?.id ?? '', id)"
    @group-renamed="(name) => renameConversation(activeConversation?.id ?? '', name)"
    @left="leaveGroup(activeConversation?.id ?? '')"
    @deleted="deleteGroup(activeConversation?.id ?? '')"
  />
</template>

<script setup lang="ts">
import ChatLayoutTemplate from '@/components/templates/ChatLayoutTemplate.vue'
import GroupMembersPanel from '@/components/organisms/GroupMembersPanel.vue'
import { useChatWorkspace } from '@/composables/useChatWorkspace'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

const auth = useAuthStore()
const membersOpen = ref(false)

const {
  accounts,
  activeAccountId,
  activeConversation,
  activeMessages,
  conversations,
  createConversation,
  deleteGroup,
  directoryUsers,
  memberRail,
  membersLabel,
  leaveGroup,
  removeMember,
  renameConversation,
  sendMessage,
  setActiveAccount,
  setActiveConversation,
  systemMessage
} = useChatWorkspace()

const chatName = computed(() => activeConversation.value?.name ?? '')
const chatAvatar = computed(() => chatName.value.slice(0, 2).toUpperCase())
const subtitle = computed(() => activeConversation.value?.isGroup ? 'Group' : 'Private')
</script>
