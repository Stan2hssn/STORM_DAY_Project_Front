<template>
  <button
    class="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition"
    :class="selected
      ? 'border-[#00a884]/60 bg-[#00a884]/14'
      : 'border-white/8 bg-[#111b21] hover:bg-[#1a262e]'"
    @click="$emit('toggle')"
  >
    <BaseAvatar :text="user.avatar" size="sm" :status="user.status === 'online'" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-[#d9dee0]">
        {{ user.name }}
      </p>
      <p class="truncate text-xs text-[#8696a0]">
        {{ user.handle }}
      </p>
    </div>
    <UIcon
      :name="selected ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
      class="h-4 w-4"
      :class="selected ? 'text-[#00a884]' : 'text-[#5f6b73]'"
    />
  </button>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import type { DirectoryUser } from '@/types/chat'

defineProps<{
  user: DirectoryUser
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>