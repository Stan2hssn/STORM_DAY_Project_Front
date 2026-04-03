<template>
  <section class="relative flex min-w-0 flex-1 flex-col bg-[#0b141a]">
    <header class="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
      <div class="flex items-center gap-3">
        <BaseAvatar :text="chatAvatar" size="lg" />
        <div>
          <p class="text-xl font-medium text-[#e9edef]">{{ chatName }}</p>
          <p class="text-xs text-[#8696a0]">{{ subtitle }} - {{ membersLabel }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <IconGhostButton icon="i-lucide-search" @click="toggleSearch" />
        <IconGhostButton icon="i-lucide-info" @click="infoOpen = !infoOpen" />
      </div>
    </header>

    <!-- Barre de recherche dans les messages -->
    <Transition
      enter-active-class="duration-150 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="duration-100 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div v-if="searchOpen" class="flex items-center gap-2 border-b border-white/10 bg-[#111b21] px-4 py-2">
        <UIcon name="i-lucide-search" class="shrink-0 text-[#8696a0]" />
        <input
          ref="searchInputEl"
          v-model="searchQuery"
          class="flex-1 bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
          placeholder="Rechercher dans les messages…"
          @keyup.escape="closeSearch"
        />
        <span v-if="searchQuery" class="shrink-0 text-xs text-[#8696a0]">
          {{ searchResultCount }} résultat{{ searchResultCount !== 1 ? 's' : '' }}
        </span>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="closeSearch" />
      </div>
    </Transition>

    <!-- Bannière contact bloqué -->
    <div
      v-if="isActiveContactBlocked"
      class="flex items-center gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2"
    >
      <UIcon name="i-lucide-user-x" class="text-yellow-400" />
      <p class="flex-1 text-xs text-yellow-300">Vous avez bloqué ce contact. Débloquez-le dans les infos de la conversation.</p>
    </div>

    <div ref="threadEl" class="chat-scroll chat-thread-bg flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
      <DateDivider />

      <template v-if="searchQuery && displayedMessages.length === 0">
        <p class="text-center text-sm text-[#8696a0]">Aucun message ne correspond à votre recherche.</p>
      </template>

      <MessageBubble
        v-for="message in displayedMessages"
        :key="message.id"
        :message="message"
        :search-highlight="searchQuery"
      />

      <p class="mx-auto max-w-5xl text-center text-sm text-[#8696a0]">{{ systemMessage }}</p>

      <p v-if="typingLabel" class="px-1 text-xs italic text-[#8696a0]">{{ typingLabel }}</p>
    </div>

    <ChatComposer
      v-if="!isActiveContactBlocked"
      @send="(text, att) => emit('send', text, att)"
      @typing="emit('typing')"
    />
    <div
      v-else
      class="flex items-center justify-center border-t border-white/10 bg-[#111b21] px-4 py-3"
    >
      <p class="text-sm text-[#8696a0]">Vous ne pouvez pas envoyer de message à un contact bloqué.</p>
    </div>

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
import { useBlockStore } from '@/stores/block'
import type { Conversation, Message } from '@/types/chat'
import { ref, computed, watch, nextTick } from 'vue'

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

const blockStore = useBlockStore()

const infoOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInputEl = ref<HTMLInputElement | null>(null)
const threadEl = ref<HTMLElement | null>(null)

// ── Recherche ─────────────────────────────────────────────────────────────────

const displayedMessages = computed(() => {
  if (!searchQuery.value.trim()) return props.messages
  const q = searchQuery.value.trim().toLowerCase()
  return props.messages.filter(m => m.text.toLowerCase().includes(q))
})

const searchResultCount = computed(() => displayedMessages.value.length)

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    nextTick(() => searchInputEl.value?.focus())
  } else {
    searchQuery.value = ''
  }
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
}

// ── Contact bloqué ────────────────────────────────────────────────────────────

const isActiveContactBlocked = computed(() => {
  if (!props.conversation) return false
  // Détection 1-on-1 : participantIds a exactement 1 autre personne
  // On vérifie via les participants de la conversation
  for (const uid of props.conversation.participantIds) {
    if (blockStore.isBlocked(uid)) return true
  }
  return false
})

// ── Scroll ────────────────────────────────────────────────────────────────────

function scrollToBottom() {
  nextTick(() => {
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  })
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.typingLabel, scrollToBottom)
watch(() => props.conversation?.id, () => {
  closeSearch()
  infoOpen.value = false
})
</script>
