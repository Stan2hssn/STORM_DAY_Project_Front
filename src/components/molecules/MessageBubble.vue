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
      <p v-if="!isRight" class="mb-1 text-[0.95rem] font-medium text-[#86d7ff]">
        {{ message.author }}
      </p>

      <!-- Image -->
      <div v-if="isImageAttachment" class="mb-2">
        <img
          :src="message.attachment"
          alt="partagée"
          class="max-h-64 max-w-full cursor-pointer rounded-lg object-cover"
          @click="lightboxOpen = true"
        />
      </div>

      <!-- Fichier non-image -->
      <a
        v-else-if="message.attachment"
        :href="message.attachment"
        target="_blank"
        rel="noopener noreferrer"
        class="mb-2 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
      >
        <UIcon name="i-lucide-file" class="text-[#8696a0]" />
        <span class="truncate">{{ fileName }}</span>
        <UIcon name="i-lucide-download" class="ml-auto shrink-0 text-[#8696a0]" />
      </a>

      <p v-if="message.text" class="text-[1.02rem] leading-relaxed">{{ message.text }}</p>

      <p class="mt-1 text-xs text-[#a7b2b9]">{{ message.time }}</p>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click="lightboxOpen = false"
      >
        <img
          :src="message.attachment"
          alt="plein écran"
          class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          @click.stop
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="absolute right-4 top-4 text-white"
          @click="lightboxOpen = false"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import type { Message } from '@/types/chat'
import { computed, ref } from 'vue'

const props = defineProps<{
  message: Message
}>()

const lightboxOpen = ref(false)

const initials = computed(() => props.message.author.slice(0, 2).toUpperCase())
const isRight = computed(() => props.message.side === 'right')

const isImageAttachment = computed(() => {
  const url = props.message.attachment
  if (!url) return false
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(url)
})

const fileName = computed(() => {
  const url = props.message.attachment
  if (!url) return ''
  try {
    return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'fichier')
  } catch {
    return 'fichier'
  }
})
</script>
