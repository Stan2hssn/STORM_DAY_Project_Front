<template>
  <!-- ForwardConversationPicker must stay OUTSIDE ChatLayoutTemplate: the layout has no default slot, only named slots. -->
  <ChatLayoutTemplate
    ref="layoutRef"
    :active-conversation-id="chatStore.activeConversationId"
  >
    <!-- Full-width app header -->
    <template #app-header>
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div
            class="flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style="background-color: var(--chat-user-bubble)"
          >
            S
          </div>
          <span class="text-lg font-semibold" style="color: var(--chat-text)">Storm</span>
        </div>

        <!-- Right: notifications + profile + theme -->
        <div class="flex items-center gap-1">
          <!-- Notifications dropdown -->
          <UDropdownMenu :items="notificationItems" :ui="dropdownUi">
            <UButton
              icon="i-lucide-bell"
              color="neutral"
              variant="ghost"
              size="md"
              class="size-11 shrink-0 justify-center"
              aria-label="Notifications"
            />
          </UDropdownMenu>

          <!-- Profile dropdown -->
          <UDropdownMenu v-model:open="profileDropdownOpen" :modal="false" :items="profileItems" :ui="dropdownUi">
            <button
              type="button"
              class="flex h-11 cursor-pointer items-center gap-2 rounded-sm px-2 transition"
              @mouseenter="openProfileDropdown"
              @mouseleave="scheduleCloseProfileDropdown"
            >
              <BaseAvatar
                v-if="auth.user"
                :text="auth.user.display_name.slice(0, 2).toUpperCase()"
                size="md" 
                class="h-full aspect-square"
              />
              <span v-if="auth.user" class="text-md font-medium" style="color: var(--chat-text)">
                {{ auth.user.display_name }}
              </span>
              <UIcon name="i-lucide-chevron-down" class="size-3.5 opacity-50" style="color: var(--chat-text-secondary)" />
            </button>
          </UDropdownMenu>

          <!-- Theme toggle -->
          <UButton
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            color="neutral"
            variant="ghost"
            size="md"
            class="size-11 shrink-0 justify-center"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          />
        </div>
      </div>
    </template>

    <!-- Left: sidebar -->
    <template #sidebar>
      <ChatSidebar
        :conversations="chatStore.conversations"
        :active-conversation-id="chatStore.activeConversationId"
        :loading="chatStore.loadingConversations"
        @select-conversation="handleSelectConversation"
        @create-conversation="handleCreateConversation"
      />
    </template>

    <!-- Top-right: chat header -->
    <template #chat-header>
      <div class="w-full">
        <div class="flex items-center justify-between">
          <div ref="chatHeaderIdentityRef" class="chat-header-fade-item flex items-center gap-3">
            <UButton
              v-if="isMobileThread"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              size="md"
              class="size-11 shrink-0 md:hidden"
              aria-label="Back to conversations"
              @click="layoutRef?.backToSidebar()"
            />
            <BaseAvatar :text="chatAvatar" size="md" :aria-hidden="true" />
            <div class="cursor-pointer" @click="infoOpen = true">
              <h2 class="text-xl font-medium hover:underline" style="color: var(--chat-text)">
                {{ chatName }}
              </h2>
              <p v-if="isGroup" class="text-xs" style="color: var(--chat-text-secondary)">
                {{ chatStore.membersLabel }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UDropdownMenu :items="conversationMenuItems">
              <IconGhostButton icon="i-lucide-ellipsis-vertical" label="More options" />
            </UDropdownMenu>
          </div>
        </div>
      </div>
    </template>

    <!-- Bottom-right: messages -->
    <template #chat-body>
      <div class="flex h-full min-h-0 flex-col">
        <ChatThread
          ref="chatThreadRef"
          :conversation="chatStore.activeConversation"
          :messages="chatStore.activeMessages"
          :chat-name="chatName"
          :system-message="chatStore.systemMessage"
          :loading="chatStore.loadingMessages"
          :is-group="isGroup"
          :typing-users="chatStore.activeTypingUsers"
          @send="handleSendMessage"
          @send-media="handleSendMedia"
          @update-message="handleUpdateMessage"
          @forward-message="handleForwardMessage"
          @typing="chatStore.emitTyping"
        />
      </div>
    </template>
  </ChatLayoutTemplate>

  <AccountSettingsModal
    v-if="settingsOpen"
    @close="settingsOpen = false"
  />

  <ConversationInfoPanel
    :open="infoOpen"
    :conversation="chatStore.activeConversation"
    @close="infoOpen = false"
    @leave="infoOpen = false"
    @delete="handleDeleteConversation"
  />

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
import BaseAvatar from '@/components/atoms/BaseAvatar.vue';
import IconGhostButton from '@/components/atoms/IconGhostButton.vue';
import ForwardConversationPicker from '@/components/molecules/ForwardConversationPicker.vue';
import AccountSettingsModal from '@/components/organisms/AccountSettingsModal.vue';
import ChatSidebar from '@/components/organisms/ChatSidebar.vue';
import ChatThread from '@/components/organisms/ChatThread.vue';
import ConversationInfoPanel from '@/components/organisms/ConversationInfoPanel.vue';
import ChatLayoutTemplate from '@/components/templates/ChatLayoutTemplate.vue';
import { useGsap } from '@/composables/useGsap';
import { useThemeToggle } from '@/composables/useThemeToggle';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import type { CreateGroupPayload, Message, ReplyTo } from '@/types/chat';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const auth = useAuthStore()
const chatStore = useChatStore()
const router = useRouter()

const layoutRef = ref<InstanceType<typeof ChatLayoutTemplate> | null>(null)
const chatThreadRef = ref<InstanceType<typeof ChatThread> | null>(null)
const chatHeaderIdentityRef = ref<HTMLDivElement | null>(null)
const forwardMessage = ref<Message | null>(null)
const settingsOpen = ref(false)
const infoOpen = ref(false)
const gsap = useGsap()
let headerTimeline: gsap.core.Timeline | null = null

const { isDark, toggleTheme } = useThemeToggle()

const conversationMenuItems = computed(() => [
  [{
    label: 'Médias partagés',
    icon: 'i-lucide-image',
    onSelect: () => { infoOpen.value = true },
  }],
  [{
    label: 'Renommer',
    icon: 'i-lucide-pencil',
    onSelect: () => { infoOpen.value = true },
  },
  {
    label: 'Ajouter un membre',
    icon: 'i-lucide-user-plus',
    onSelect: () => { infoOpen.value = true },
  }],
  [{
    label: 'Quitter la conversation',
    icon: 'i-lucide-log-out',
    color: 'error' as const,
    onSelect: () => { infoOpen.value = true },
  },
  {
    label: 'Supprimer la discussion',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => handleDeleteConversation(),
  }],
])
const isMobileThread = computed(() => !!chatStore.activeConversationId)
const isGroup = computed(() => chatStore.activeMembers.length > 2)
const chatName = computed(() => chatStore.activeConversationDisplayName)
const chatAvatar = computed(() => chatName.value.slice(0, 2).toUpperCase())

const notificationItems = computed(() => {
  const unread = chatStore.conversations.filter((c) => c.unread > 0)
  if (!unread.length) {
    return [[{ label: 'No new notifications', disabled: true, icon: 'i-lucide-bell-off' }]]
  }
  return [
    unread.map((c) => ({
      label: c.name,
      description: c.preview,
      icon: 'i-lucide-message-circle',
      badge: String(c.unread),
      onSelect: () => handleSelectConversation(c.id),
    })),
  ]
})

const profileItems = [
  [{ label: 'Settings', icon: 'i-lucide-settings', onSelect: () => { settingsOpen.value = true } }],
  [{ label: 'Log out', icon: 'i-lucide-log-out', onSelect: () => handleLogout() }],
]

const profileDropdownOpen = ref(false)
let profileCloseTimer: ReturnType<typeof setTimeout> | undefined
let profilePortalEl: Element | null = null

function openProfileDropdown() {
  clearTimeout(profileCloseTimer)
  profileDropdownOpen.value = true
}

function scheduleCloseProfileDropdown() {
  profileCloseTimer = globalThis.setTimeout(() => {
    profileDropdownOpen.value = false
  }, 150)
}

// Attach hover listeners to the portal content so moving from trigger → menu doesn't close it.
watch(profileDropdownOpen, async (isOpen) => {
  await nextTick()
  if (isOpen) {
    profilePortalEl = document.querySelector('[data-reka-popper-content-wrapper]')
    profilePortalEl?.addEventListener('mouseenter', openProfileDropdown)
    profilePortalEl?.addEventListener('mouseleave', scheduleCloseProfileDropdown)
  } else {
    profilePortalEl?.removeEventListener('mouseenter', openProfileDropdown)
    profilePortalEl?.removeEventListener('mouseleave', scheduleCloseProfileDropdown)
    profilePortalEl = null
  }
})

const dropdownUi = {
  content: 'z-[200] p-0 overflow-hidden ring-0 shadow-lg',
  group: 'p-0 isolate',
  item: 'rounded-none before:rounded-none px-4 py-2.5',
}

/** Transition key: changes with each conversation (fade between chats + appear on load). */
const chatTransitionKey = computed(() => chatStore.activeConversationId ?? '__none__')

function headerFadeOut(): Promise<void> {
  return new Promise<void>((resolve) => {
    const identity = chatHeaderIdentityRef.value
    if (!identity) { resolve(); return }
    headerTimeline?.kill()
    headerTimeline = gsap.timeline({ onComplete: resolve })
    headerTimeline.to(identity, {
      opacity: 0,
      duration: 0.28,
      ease: 'power1.in',
    })
  })
}

// Fade-in only — triggered after the store updates (chatTransitionKey changes)
watch(chatTransitionKey, async () => {
  await nextTick()
  const identity = chatHeaderIdentityRef.value
  if (!identity) return
  headerTimeline?.kill()
  headerTimeline = gsap.timeline()
  headerTimeline.set(identity, { opacity: 0 })
  headerTimeline.to(identity, {
    opacity: 1,
    duration: 0.35,
    ease: 'power2.out',
  })
}, { immediate: true })

async function handleDeleteConversation() {
  const id = chatStore.activeConversationId
  if (!id) return
  infoOpen.value = false
  await chatStore.deleteConversation(id)
}

async function handleCreateConversation(payload: CreateGroupPayload) {
  await chatStore.createConversation(payload)
  layoutRef.value?.selectThread()
  await nextTick()
  chatThreadRef.value?.fadeIn()
}

async function handleSelectConversation(id: string) {
  await Promise.all([chatThreadRef.value?.fadeOut(), headerFadeOut()])
  chatStore.selectConversation(id)
  layoutRef.value?.selectThread()
  // Fallback for conversations where loading never changes (cached data)
  await nextTick()
  chatThreadRef.value?.fadeIn()
}

function handleSendMessage(text: string, replyTo?: ReplyTo) {
  chatStore.sendMessage(text, replyTo).catch((error: unknown) => {
    console.error('[ChatView] sendMessage failed:', error)
  })
}

function handleSendMedia(url: string) {
  chatStore.sendMessage(' ', undefined, { attachment: url }).catch((error: unknown) => {
    console.error('[ChatView] sendMedia failed:', error)
  })
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
    // TODO(fix/toast-notifications): replace globalThis.alert with useToast() from Nuxt UI.
    // useToast().add({ title: 'Could not forward message', description: errorMessage, color: 'red' })
    // Remove globalThis.alert once UNotifications is mounted in App.vue / ChatView root.
    const errorMessage = 'error' in result ? result.error : 'Unknown error'
    globalThis.alert(`Could not forward the message.\n\n${errorMessage}\n\nIf the API rejects forward_from_id, the gateway/message-service may not support it yet (see README — backlog transfert).`)
    return
  }
  if (result.forwardMetadataSkipped) {
    // TODO(fix/toast-notifications): replace with useToast().add({ title: '...', color: 'yellow' })
    globalThis.alert(
      'Message was sent as plain text only.\n\nThe source message has no numeric server id (e.g. it only existed over WebSocket). Open the conversation once so messages load from the API, then try forward again.',
    )
  }
  await chatStore.selectConversation(conversationId)
  layoutRef.value?.selectThread()
}

async function handleLogout() {
  await import('@/views/LoginView.vue')
  await auth.logout()
  await router.push('/login')
}

onMounted(async () => {
  chatStore.initWebSocket()
  await chatStore.fetchConversations()
})

onUnmounted(() => {
  headerTimeline?.kill()
  headerTimeline = null
  clearTimeout(profileCloseTimer)
  profilePortalEl?.removeEventListener('mouseenter', openProfileDropdown)
  profilePortalEl?.removeEventListener('mouseleave', scheduleCloseProfileDropdown)
  chatStore.destroyWebSocket()
})
</script>
