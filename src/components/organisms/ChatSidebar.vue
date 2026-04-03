<template>
  <aside class="hidden w-[390px] shrink-0 flex-col border-r border-white/10 bg-[#111b21] md:flex">
    <div class="border-b border-white/10 px-4 py-4">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-2xl font-semibold text-[#e9edef]">Chats</p>
          <p class="text-xs text-[#8696a0]">{{ currentAccount?.name }} - {{ currentAccount?.role }}</p>
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

      <!-- Bannière utilisateur connecté — cliquable pour ouvrir le profil -->
      <button
        v-if="auth.user"
        class="mb-3 flex w-full items-center gap-2 rounded-lg bg-[#202c33] px-3 py-2 text-left transition-colors hover:bg-[#2a3942]"
        @click="profileOpen = true"
      >
        <div
          v-if="!auth.user.avatar_url"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style="background: #00a884;"
        >
          {{ auth.user.display_name.slice(0, 2).toUpperCase() }}
        </div>
        <img
          v-else
          :src="auth.user.avatar_url"
          alt="avatar"
          class="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-[#e9edef]">{{ auth.user.display_name }}</p>
          <p class="truncate text-xs text-[#8696a0]">@{{ auth.user.username }}</p>
        </div>
        <span class="h-2 w-2 shrink-0 rounded-full bg-[#00a884]" title="Connecté" />
      </button>

      <div class="chat-scroll mb-3 flex gap-2 overflow-x-auto pb-1">
        <AccountChip
          v-for="account in props.accounts"
          :key="account.id"
          :account="account"
          :active="props.currentAccountId === account.id"
          @select="emit('switchAccount', account.id)"
        />
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

    <!-- Modal profil utilisateur -->
    <UserProfileModal :open="profileOpen" @close="profileOpen = false" />
  </aside>
</template>

<script setup lang="ts">
import AccountChip from '@/components/molecules/AccountChip.vue'
import ConversationItem from '@/components/molecules/ConversationItem.vue'
import CreateConversationPanel from '@/components/organisms/CreateConversationPanel.vue'
import UserProfileModal from '@/components/organisms/UserProfileModal.vue'
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
const profileOpen = ref(false)

const props = defineProps<{
  conversations: Conversation[]
  accounts: Account[]
  currentAccountId: string
  users: DirectoryUser[]
}>()

const filteredConversations = computed(() => {
  const search = conversationSearch.value.trim().toLowerCase()
  if (!search) return props.conversations
  return props.conversations.filter(c =>
    c.name.toLowerCase().includes(search) || c.preview.toLowerCase().includes(search)
  )
})

const currentAccount = computed(() =>
  props.accounts.find(a => a.id === props.currentAccountId) ?? null
)

function handleCreateConversation(payload: CreateConversationPayload) {
  emit('createConversation', payload)
  createConversationOpen.value = false
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>
