<template>
  <footer class="border-t border-white/10 bg-[#202c33] p-3 sm:p-4">
    <!-- Aperçu fichier sélectionné -->
    <div v-if="pendingFile" class="mb-2 flex items-center gap-2 rounded-lg bg-[#2a3942] px-3 py-2">
      <img v-if="isImage" :src="previewUrl" alt="aperçu" class="h-12 w-12 rounded object-cover" />
      <UIcon v-else name="i-lucide-file" class="text-[#8696a0]" />
      <span class="flex-1 truncate text-sm text-[#d9dee0]">{{ pendingFile.name }}</span>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="clearFile" />
    </div>

    <div class="flex items-center gap-2 rounded-xl border border-white/6 bg-[#2a3942] p-2">
      <!-- Bouton attachment -->
      <label class="cursor-pointer" aria-label="Joindre un fichier">
        <input ref="fileInput" id="file-upload" type="file" accept="image/*,video/*,.pdf,.doc,.docx" class="hidden" @change="handleFileChange" />
        <UButton
          as="span"
          icon="i-lucide-paperclip"
          color="neutral"
          variant="ghost"
          :loading="uploading"
        />
      </label>

      <UInput
        v-model="draft"
        class="w-full"
        placeholder="Type a message"
        size="xl"
        :ui="{ base: 'border-0 ring-0 bg-transparent text-[#d9dee0] placeholder:text-[#75818a]' }"
        @keydown.enter.prevent="handleSend"
        @input="handleTyping"
      />
      <UButton
        icon="i-lucide-send"
        color="primary"
        variant="soft"
        class="shrink-0 rounded-full"
        :disabled="!canSend"
        @click="handleSend"
      />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  send: [text: string, attachment?: string]
  typing: []
}>()

const auth = useAuthStore()
const draft = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const previewUrl = ref('')
const uploading = ref(false)

const isImage = computed(() => pendingFile.value?.type.startsWith('image/') ?? false)
const canSend = computed(() => !!draft.value.trim() || !!pendingFile.value)

function handleTyping() {
  emit('typing')
}

function clearFile() {
  pendingFile.value = null
  previewUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingFile.value = file
  if (file.type.startsWith('image/')) {
    previewUrl.value = URL.createObjectURL(file)
  }
}

async function handleSend() {
  if (!canSend.value || uploading.value) return

  let attachmentUrl: string | undefined

  if (pendingFile.value) {
    uploading.value = true
    try {
      const form = new FormData()
      form.append('file', pendingFile.value)
      const res = await fetch('/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        body: form,
      })
      if (res.ok) {
        const data = await res.json()
        attachmentUrl = data.url as string
      }
    } catch {
      // upload failed, send without attachment
    } finally {
      uploading.value = false
    }
  }

  emit('send', draft.value.trim(), attachmentUrl)
  draft.value = ''
  clearFile()
}
</script>
