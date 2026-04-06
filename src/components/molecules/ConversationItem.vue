<template>
  <div class="group relative flex w-full items-center rounded-xl transition" :class="conversation.active ? 'bg-[#202c33]' : 'hover:bg-[#1a262e]'">
    <button
      class="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
      @click="$emit('select', conversation.id)"
    >
      <BaseAvatar :text="initials" size="sm" />

      <div class="min-w-0 flex-1">
        <p class="truncate text-[1.05rem] font-medium text-[#e9edef]">
          {{ conversation.name }}
        </p>
        <p class="truncate text-sm text-[#8696a0]">
          {{ conversation.preview }}
        </p>
      </div>

      <div class="flex shrink-0 flex-col items-end gap-1">
        <span class="text-xs text-[#8696a0]">{{ conversation.time }}</span>
        <UBadge v-if="conversation.unread" size="sm" color="primary" variant="soft">
          {{ conversation.unread }}
        </UBadge>
      </div>
    </button>

    <!-- Bouton archiver (apparaît au hover) -->
    <button
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8696a0] opacity-0 transition-opacity hover:bg-white/10 hover:text-[#e9edef] group-hover:opacity-100"
      :title="archived ? 'Désarchiver' : 'Archiver'"
      @click.stop="toggleArchive"
    >
      <UIcon :name="archived ? 'i-lucide-archive-x' : 'i-lucide-archive'" class="text-sm" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import { useArchiveStore } from '@/stores/archive'
import type { Conversation } from '@/types/chat'

const props = defineProps<{ conversation: Conversation }>()

defineEmits<{ select: [conversationId: string] }>()

const archiveStore = useArchiveStore()

const initials = computed(() => props.conversation.name.slice(0, 2).toUpperCase())
const archived = computed(() => archiveStore.isArchived(props.conversation.id))

function toggleArchive() {
  if (archived.value) {
    archiveStore.unarchiveConversation(props.conversation.id)
  } else {
    archiveStore.archiveConversation(props.conversation.id)
  }
}
</script>
