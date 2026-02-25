<template>
  <aside class="hidden w-[72px] shrink-0 flex-col items-center gap-3 border-l border-white/10 bg-[#111b21] py-4 xl:flex">
    <BaseAvatar
      v-for="member in members"
      :key="member"
      :text="member"
      size="sm"
      status
    />
  </aside>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'

defineProps<{
  members: string[]
}>()
</script>