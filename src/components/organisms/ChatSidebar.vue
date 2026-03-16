<template>
  <aside class="hidden w-[390px] shrink-0 flex-col border-r border-white/10 bg-[#111b21] md:flex">
    <div class="border-b border-white/10 px-4 py-4">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-2xl font-semibold text-[#e9edef]">
            Chats
          </p>
          <p class="text-xs text-[#8696a0]">
            {{ currentAccount?.name }} - {{ currentAccount?.role }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-square-pen"
            color="neutral"
            variant="ghost"
            :ui="{ base: 'text-[#9fb0ba] hover:bg-[#2a3942]' }"
            @click="createConversationOpen = true"
          />
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            :ui="{ base: 'text-[#9fb0ba] hover:bg-[#2a3942]' }"
            @click="handleLogout"
          />
        </div>
      </div>

      <!-- User connecté -->
      <div v-if="auth.user" class="mb-3 flex items-center gap-2 rounded-lg bg-[#202c33] px-3 py-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style="background: #00a884;">
          {{ auth.user.display_name.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-[#e9edef]">{{ auth.user.display_name }}</p>
          <p class="truncate text-xs text-[#8696a0]">@{{ auth.user.username }}</p>
        </div>
        <span class="h-2 w-2 rounded-full bg-[#00a884]" title="Connecté" />
      </div>

      <UInput
        v-model="conversationSearch"
        placeholder="Search"
        size="md"
        :ui="{ base: 'bg-[#202c33] ring-transparent text-[#d9dee0] placeholder:text-[#8696a0]' }"
      />
    </div>

    <div class="chat-scroll flex-1 space-y-1 overflow-y-auto px-2 py-2">
      <ConversationItem
        v-for="conversation in filteredConversations"
        :key="conversation.id"
        :conversation="conversation"
        @select="(id) => emit('selectConversation', id)"
      />
    </div>

    <CreateConversationPanel
      :open="createConversationOpen"
      :users="props.users"
      @close="createConversationOpen = false"
      @create="handleCreateConversation"
    />
  </aside>
</template>

<script setup lang="ts">
import ConversationItem from '@/components/molecules/ConversationItem.vue'
import CreateConversationPanel from '@/components/organisms/CreateConversationPanel.vue'
import type { Account, Conversation, CreateConversationPayload, DirectoryUser } from '@/types/chat'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'

const auth = useAuthStore()
const router = useRouter()

const emit = defineEmits<{
  selectConversation: [conversationId: string]
  switchAccount: [accountId: string]
  createConversation: [payload: CreateConversationPayload]
}>()

const conversationSearch = ref('')
const createConversationOpen = ref(false)

const props = defineProps<{
  conversations: Conversation[]
  accounts: Account[]
  currentAccountId: string
  users: DirectoryUser[]
}>()

const filteredConversations = computed(() => {
  const search = conversationSearch.value.trim().toLowerCase()

  if (!search) {
    return props.conversations
  }

  return props.conversations.filter((conversation) => {
    return conversation.name.toLowerCase().includes(search) || conversation.preview.toLowerCase().includes(search)
  })
})

const currentAccount = computed(() => {
  return props.accounts.find((account) => account.id === props.currentAccountId) ?? null
})

function handleCreateConversation(payload: CreateConversationPayload) {
  emit('createConversation', payload)
  createConversationOpen.value = false
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>
