<template>
  <button
    class="flex min-w-[132px] items-center gap-2 rounded-xl border px-2 py-2 text-left transition"
    :class="active
      ? 'border-[#00a884]/65 bg-[#00a884]/14'
      : 'border-white/8 bg-[#111b21] hover:bg-[#1a262e]'"
    @click="$emit('select')"
  >
    <BaseAvatar :text="account.avatar" size="xs" />
    <div class="min-w-0">
      <p class="truncate text-xs font-medium text-[#d9dee0]">
        {{ account.name }}
      </p>
      <p class="truncate text-[11px] text-[#8696a0]">
        {{ account.role }}
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import type { Account } from '@/types/chat'

defineProps<{
  account: Account
  active: boolean
}>()

defineEmits<{
  select: []
}>()
</script>