<template>
  <div class="group mx-auto flex w-full max-w-5xl items-end gap-2" :class="isRight ? 'justify-end' : ''">
    <BaseAvatar v-if="!isRight" :text="initials" size="xs" status />

    <div class="relative max-w-[78%]">

      <!-- Actions hover (messages propres uniquement) -->
      <div
        v-if="isRight && !message.deleted"
        class="absolute -top-8 right-0 flex items-center gap-1 rounded-lg border border-white/10 bg-[#1d2c33] px-1 py-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        <button
          class="rounded p-1 text-[#8696a0] hover:bg-white/10 hover:text-[#e9edef]"
          title="Copier"
          @click="copyText"
        >
          <UIcon name="i-lucide-copy" class="text-sm" />
        </button>
        <button
          class="rounded p-1 text-[#8696a0] hover:bg-white/10 hover:text-[#e9edef]"
          title="Modifier"
          @click="startEdit"
        >
          <UIcon name="i-lucide-pencil" class="text-sm" />
        </button>
        <button
          class="rounded p-1 text-[#8696a0] hover:bg-white/10 hover:text-red-400"
          title="Supprimer"
          @click="confirmDelete"
        >
          <UIcon name="i-lucide-trash-2" class="text-sm" />
        </button>
      </div>

      <div
        class="rounded-lg px-4 py-3"
        :class="isRight
          ? 'rounded-br-none bg-[#005c4b] text-[#e9edef]'
          : 'rounded-bl-none bg-[#202c33] text-[#d1d7db]'"
      >
        <p v-if="!isRight" class="mb-1 text-[0.95rem] font-medium text-[#86d7ff]">
          {{ message.author }}
        </p>

        <!-- Message supprimé -->
        <p v-if="message.deleted" class="text-sm italic text-[#8696a0]">
          🚫 Message supprimé
        </p>

        <template v-else>
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

          <!-- Mode édition -->
          <div v-if="isEditing" class="flex items-center gap-2">
            <input
              ref="editInput"
              v-model="editDraft"
              class="flex-1 rounded border border-[#00a884] bg-transparent text-[1.02rem] leading-relaxed outline-none"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
            <button class="text-[#00a884] hover:text-white" @click="saveEdit">
              <UIcon name="i-lucide-check" />
            </button>
            <button class="text-[#8696a0] hover:text-white" @click="cancelEdit">
              <UIcon name="i-lucide-x" />
            </button>
          </div>
          <p v-else-if="message.text" class="text-[1.02rem] leading-relaxed">
            {{ message.text }}
          </p>
        </template>

        <p class="mt-1 text-xs text-[#a7b2b9]">
          {{ message.time }}
          <span v-if="message.deleted === false && isRight" class="ml-1 italic opacity-60">modifié</span>
        </p>
      </div>
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
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types/chat'
import { computed, nextTick, ref } from 'vue'

const props = defineProps<{ message: Message }>()

const chat = useChatStore()
const lightboxOpen = ref(false)
const isEditing = ref(false)
const editDraft = ref('')
const editInput = ref<HTMLInputElement | null>(null)

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

// ── Actions ───────────────────────────────────────────────────────────────────

async function copyText() {
  try {
    await navigator.clipboard.writeText(props.message.text)
  } catch {
    // clipboard not available
  }
}

function startEdit() {
  editDraft.value = props.message.text
  isEditing.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

async function saveEdit() {
  const content = editDraft.value.trim()
  if (!content || content === props.message.text) {
    cancelEdit()
    return
  }
  await chat.editMessage(props.message.id, content)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editDraft.value = ''
}

async function confirmDelete() {
  await chat.deleteMessage(props.message.id)
}
</script>
