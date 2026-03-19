<template>
  <aside
    class="hidden w-[72px] shrink-0 flex-col items-center gap-3 py-4 xl:flex"
    aria-label="Conversation members"
  >
    <BaseAvatar
      v-for="member in members"
      :key="member"
      :text="member"
      size="sm"
      status
      :aria-label="member"
    />
  </aside>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'

defineProps<{
  members: string[]
}>()
</script>
