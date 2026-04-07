<template>
  <div class="flex h-full flex-col p-5" aria-label="Conversations">
    <!-- Search + New conversation -->
    <div class="flex items-center gap-2 pb-4">
      <UInput
        v-model="conversationSearch"
        id="conversation-search"
        icon="i-lucide-search"
        placeholder="Search a conversation"
        size="lg"
        aria-label="Search conversations"
        :ui="{ base: 'ring-transparent' }"
        class="flex-1"
      />
      <UButton
        icon="i-lucide-square-pen"
        color="neutral"
        variant="ghost"
        size="md"
        class="size-11 shrink-0 justify-center"
        aria-label="New conversation"
        @click="createConversationOpen = true"
      />
    </div>

    <!-- Filters -->
    <div class="flex gap-1 pb-4" role="tablist" aria-label="Conversation filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        role="tab"
        :aria-selected="activeFilter === filter.value"
        class="rounded-sm px-3 py-2 text-xs font-medium transition"
        :class="
          activeFilter === filter.value
            ? 'bg-(--chat-user-bubble) text-white'
            : 'text-(--chat-text-secondary) hover:bg-(--chat-surface-hover)'
        "
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Conversation list -->
    <nav class="chat-scroll flex-1 overflow-y-auto py-1" aria-label="Conversation list">
      <output v-if="loading" class="block py-8 text-center text-sm" style="color: var(--chat-text-secondary)">
        Loading conversations...
      </output>

      <p v-else-if="filteredConversations.length === 0" class="py-8 text-center text-sm" style="color: var(--chat-text-secondary)">
        No conversations yet
      </p>

      <TransitionGroup v-else name="conv-list" tag="div" class="space-y-1">
        <ConversationItem
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          :conversation="conversation"
          :active="conversation.id === activeConversationId"
          @select="(id) => emit('selectConversation', id)"
        />
      </TransitionGroup>
    </nav>

    <CreateConversationPanel
      :open="createConversationOpen"
      @close="createConversationOpen = false"
      @create="handleCreateConversation"
    />
  </div>
</template>

<script setup lang="ts">
import ConversationItem from '@/components/molecules/ConversationItem.vue';
import CreateConversationPanel from '@/components/organisms/CreateConversationPanel.vue';
import type { Conversation, CreateGroupPayload } from '@/types/chat';
import { computed, ref } from 'vue';

const emit = defineEmits<{
  selectConversation: [conversationId: string]
  createConversation: [payload: CreateGroupPayload]
}>()

const props = defineProps<{
  conversations: Conversation[]
  activeConversationId: string | null
  loading: boolean
}>()

type FilterValue = 'recent' | 'all' | 'archived' | 'favorites'

const filters: { label: string; value: FilterValue }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'All', value: 'all' },
  { label: 'Archived', value: 'archived' },
  { label: 'Favorites', value: 'favorites' },
]

const conversationSearch = ref('')
const createConversationOpen = ref(false)
const activeFilter = ref<FilterValue>('recent')

const filteredConversations = computed(() => {
  const search = conversationSearch.value.trim().toLowerCase()
  let list = props.conversations

  // TODO(feat/conversation-filters): apply activeFilter once backend exposes the fields.
  // Required API changes:
  //   - PATCH /api/groups/{id}  → body: { is_archived: boolean } or { is_favorite: boolean }
  //   - Conversation type must expose `is_archived` and `is_favorite` boolean fields
  //   - 'recent' → sort by last_message_at DESC (already default, confirm with backend)
  //   - 'archived' → list.filter(c => c.is_archived)
  //   - 'favorites' → list.filter(c => c.is_favorite)
  //   - 'all' → no additional filter
  if (activeFilter.value === 'archived' || activeFilter.value === 'favorites') {
    // Placeholder: these filters are UI-only until backend supports is_archived / is_favorite
    list = []
  }

  if (search) {
    list = list.filter(
      (c) => c.name.toLowerCase().includes(search) || c.preview.toLowerCase().includes(search),
    )
  }

  return list
})

function handleCreateConversation(payload: CreateGroupPayload) {
  emit('createConversation', payload)
  createConversationOpen.value = false
}

function openCreate() {
  createConversationOpen.value = true
}

defineExpose({ openCreate })
</script>

<style scoped>
.conv-list-enter-active {
  transition:
    opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.conv-list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.conv-list-move {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.conv-list-leave-active {
  transition: opacity 0.15s ease-in;
  position: absolute;
  width: 100%;
}

.conv-list-leave-to {
  opacity: 0;
}
</style>
