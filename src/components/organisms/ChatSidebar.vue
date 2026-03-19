<template>
  <div class="flex h-full flex-col" aria-label="Conversations">
    <!-- Search input at top of conversation list -->
    <div class="pb-2">
      <UInput
        v-model="conversationSearch"
        placeholder="Search a conversation"
        size="xl"
        rounded="full"
        aria-label="Search conversations"
        :ui="{ base: 'ring-transparent' }"
        :style="{ color: 'var(--chat-text)' }"
        class="w-full"
      />
    </div>

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

const conversationSearch = ref('')
const createConversationOpen = ref(false)

const filteredConversations = computed(() => {
  const search = conversationSearch.value.trim().toLowerCase()
  if (!search) return props.conversations
  return props.conversations.filter(
    (c) => c.name.toLowerCase().includes(search) || c.preview.toLowerCase().includes(search),
  )
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
