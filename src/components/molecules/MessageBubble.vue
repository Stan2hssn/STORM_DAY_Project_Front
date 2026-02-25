<template>
  <div class="mx-auto flex w-full max-w-5xl items-end gap-2" :class="isRight ? 'justify-end' : ''">
    <BaseAvatar
      v-if="!isRight"
      :text="initials"
      size="xs"
      status
    />

    <div
      class="max-w-[78%] rounded-lg px-4 py-3"
      :class="isRight
        ? 'rounded-br-md rounded-br-none bg-[#005c4b] text-[#e9edef]'
        : 'rounded-bl-md rounded-bl-none bg-[#202c33] text-[#d1d7db]'"
    >
      <p v-if="!isRight" class="mb-1 text-[0.95rem] font-medium text-[#86d7ff] ">
        {{ message.author }}
      </p>
      <p class="text-[1.02rem] leading-relaxed">
        {{ message.text }}
      </p>
      <p class="mt-1 text-xs text-[#a7b2b9]">
        {{ message.time }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue';
import type { Message } from '@/types/chat';
import { computed } from 'vue';

const props = defineProps<{
  message: Message
}>()

const initials = computed(() => props.message.author.slice(0, 2).toUpperCase())
const isRight = computed(() => props.message.side === 'right')
</script>