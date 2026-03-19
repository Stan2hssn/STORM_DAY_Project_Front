<template>
  <!-- ForwardConversationPicker must stay OUTSIDE ChatLayoutTemplate: the layout has no default slot, only named slots. -->
  <ChatLayoutTemplate
    ref="layoutRef"
    :active-conversation-id="chatStore.activeConversationId"
  >
    <!-- Top-left: sidebar header -->
    <template #sidebar-header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold" style="color: var(--chat-text)">
            Chats
          </h1>
          <p v-if="auth.user" class="text-xs" style="color: var(--chat-text-secondary)">
            {{ auth.user.display_name }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            color="neutral"
            variant="ghost"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          />
          <UButton
            icon="i-lucide-play"
            color="neutral"
            variant="ghost"
            aria-label="Load demo data"
            @click="chatStore.loadDemoData()"
          />
          <UButton
            icon="i-lucide-square-pen"
            color="neutral"
            variant="ghost"
            aria-label="New conversation"
            @click="sidebarRef?.openCreate()"
          />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            aria-label="Log out"
            @click="handleLogout"
          />
        </div>
      </div>
    </template>

    <!-- Top-right: chat header -->
    <template #chat-header>
      <Transition name="chat-fade" mode="out-in" appear>
        <div :key="chatTransitionKey" class="w-full">
          <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            v-if="isMobileThread"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Back to conversations"
            class="md:hidden"
            @click="layoutRef?.backToSidebar()"
          />
          <BaseAvatar :text="chatAvatar" size="lg" :aria-hidden="true" />
          <div>
            <h2 class="text-xl font-medium" style="color: var(--chat-text)">
              {{ chatName }}
            </h2>
            <p v-if="isGroup" class="text-xs" style="color: var(--chat-text-secondary)">
              {{ chatStore.membersLabel }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <IconGhostButton icon="i-lucide-user-plus" label="Add member" />
          <IconGhostButton icon="i-lucide-search" label="Search messages" />
          <IconGhostButton icon="i-lucide-ellipsis-vertical" label="More options" />
          </div>
        </div>
        </div>
      </Transition>
    </template>

    <!-- Bottom-left: conversation list -->
    <template #sidebar-body>
      <ChatSidebar
        ref="sidebarRef"
        :conversations="chatStore.conversations"
        :active-conversation-id="chatStore.activeConversationId"
        :loading="chatStore.loadingConversations"
        @select-conversation="handleSelectConversation"
        @create-conversation="chatStore.createConversation"
      />
    </template>

    <!-- Bottom-right: messages -->
    <template #chat-body>
      <Transition name="chat-fade" mode="out-in" appear>
        <div
          :key="chatTransitionKey"
          class="flex h-full min-h-0 flex-col"
        >
          <ChatThread
            :messages="chatStore.activeMessages"
            :chat-name="chatName"
            :system-message="chatStore.systemMessage"
            :loading="chatStore.loadingMessages"
            :is-group="isGroup"
            :typing-users="chatStore.activeTypingUsers"
            @send="handleSendMessage"
            @update-message="handleUpdateMessage"
            @forward-message="handleForwardMessage"
            @typing="chatStore.emitTyping"
          />
        </div>
      </Transition>
    </template>
  </ChatLayoutTemplate>

  <ForwardConversationPicker
    v-if="forwardMessage"
    :message-preview="forwardMessage.text"
    :conversations="chatStore.conversations"
    :active-conversation-id="chatStore.activeConversationId"
    @forward="handleForwardToConversation"
    @cancel="forwardMessage = null"
  />
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import IconGhostButton from '@/components/atoms/IconGhostButton.vue'
import ForwardConversationPicker from '@/components/molecules/ForwardConversationPicker.vue'
import ChatSidebar from '@/components/organisms/ChatSidebar.vue'
import ChatThread from '@/components/organisms/ChatThread.vue'
import ChatLayoutTemplate from '@/components/templates/ChatLayoutTemplate.vue'
import type { Message, ReplyTo } from '@/types/chat'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const chatStore = useChatStore()
const router = useRouter()

const layoutRef = ref<InstanceType<typeof ChatLayoutTemplate> | null>(null)
const sidebarRef = ref<InstanceType<typeof ChatSidebar> | null>(null)
const forwardMessage = ref<Message | null>(null)

const isDark = ref(document.documentElement.classList.contains('dark'))
const isMobileThread = computed(() => !!chatStore.activeConversationId)
const isGroup = computed(() => chatStore.activeMembers.length > 2)
const chatName = computed(() => chatStore.activeConversationDisplayName)
const chatAvatar = computed(() => chatName.value.slice(0, 2).toUpperCase())

/** Clé de transition : change à chaque conversation (fade entre les chats + appear au chargement). */
const chatTransitionKey = computed(() => chatStore.activeConversationId ?? '__none__')

function toggleTheme() {
  isDark.value = !isDark.value
  const el = document.documentElement
  el.classList.add('theme-transition')
  el.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  setTimeout(() => el.classList.remove('theme-transition'), 700)
}

function handleSelectConversation(id: string) {
  chatStore.selectConversation(id)
  layoutRef.value?.selectThread()
}

function handleSendMessage(text: string, replyTo?: ReplyTo) {
  void chatStore.sendMessage(text, replyTo)
}

function handleUpdateMessage(id: string, text: string) {
  chatStore.editMessage(id, text)
}

function handleForwardMessage(message: Message) {
  forwardMessage.value = message
}

async function handleForwardToConversation(conversationId: string) {
  const src = forwardMessage.value
  if (!src) return
  const text = src.text
  const forwardFromId = src.id
  const forwardFromPreview = {
    id: forwardFromId,
    author: src.author,
    text: src.text,
  }
  forwardMessage.value = null
  const result = await chatStore.sendMessage(text, undefined, {
    conversationId,
    forwardFromMessageId: forwardFromId,
    forwardFromPreview,
  })
  if (!result.ok) {
    // TODO(ux): remplacer par toast (Nuxt UI) — voir README backlog.
    window.alert(`Could not forward the message.\n\n${result.error}\n\nIf the API rejects forward_from_id, the gateway/message-service may not support it yet (see README — backlog transfert).`)
    return
  }
  if (result.forwardMetadataSkipped) {
    // TODO(ux): toast au lieu d’alert
    window.alert(
      'Message was sent as plain text only.\n\nThe source message has no numeric server id (e.g. it only existed over WebSocket). Open the conversation once so messages load from the API, then try forward again.',
    )
  }
  await chatStore.selectConversation(conversationId)
  layoutRef.value?.selectThread()
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

onMounted(async () => {
  chatStore.initWebSocket()
  await chatStore.fetchConversations()
})

onUnmounted(() => {
  chatStore.destroyWebSocket()
})
</script>
