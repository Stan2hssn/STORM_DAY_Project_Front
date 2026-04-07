<template>
  <div class="mt-1 flex justify-end">
    <div class="flex -space-x-1.5">
      <div
        v-for="user in seenBy.slice(0, 5)"
        :key="user.id"
        class="flex size-4 items-center justify-center rounded-full text-[0.45rem] font-medium ring-1"
        :style="avatarStyle"
        :title="user.displayName"
      >
        {{ user.displayName.slice(0, 2).toUpperCase() }}
      </div>
      <div
        v-if="seenBy.length > 5"
        class="flex size-4 items-center justify-center rounded-full text-[0.45rem] font-medium ring-1"
        :style="avatarStyle"
      >
        +{{ seenBy.length - 5 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeenByUser } from '@/types/chat';
import { computed } from 'vue';

defineProps<{
  seenBy: SeenByUser[]
}>()

const avatarStyle = computed(() => ({
  backgroundColor: 'var(--chat-surface)',
  color: 'var(--chat-accent)',
  '--tw-ring-color': 'var(--chat-body)',
}))
</script>
