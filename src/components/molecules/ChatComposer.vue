<template>
  <div
    class="overflow-hidden"
    :style="{
      borderRadius: 'var(--chat-bubble-radius)',
      backgroundColor: 'var(--chat-composer)',
    }"
  >
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <ReplyPreviewBanner
        v-if="replyTo"
        :reply-to="replyTo"
        @cancel="$emit('cancel-reply')"
      />
    </Transition>

    <!-- Edit mode banner -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="editTarget"
        class="flex items-center gap-2 border-b px-3 py-2"
        :style="{
          backgroundColor: 'var(--chat-composer)',
          borderColor: 'var(--chat-border)',
        }"
      >
        <span class="flex-1 text-xs italic" style="color: var(--chat-text-muted)">Editing message</span>
        <button
          type="button"
          class="shrink-0 rounded-sm p-1 text-xs"
          :style="{ color: 'var(--chat-text-secondary)' }"
          aria-label="Cancel edit"
          @click="cancelEdit"
        >
          Cancel
        </button>
      </div>
    </Transition>

    <form
      class="flex items-center gap-2 p-2"
      :aria-label="editTarget ? 'Edit message' : 'Message composer'"
      @submit.prevent="handleSubmit"
    >
      <!-- TODO(feat/message-attachments): implement file attachment upload.
           Required API: POST /api/messages with multipart/form-data, field name "attachment".
           Backend must return attachment_url on the message object.
           UI: file picker on click, preview thumbnail before send, progress indicator. -->
      <div class="attach-btn-square p-1">
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/avi"
          class="hidden"
          @change="handleFileChange"
        />
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          class="size-full min-w-0 min-h-0 rounded-sm w-full h-full flex align-center justify-center"
          aria-label="Attach file"
          :disabled="!!editTarget || uploading"
          :loading="uploading"
          @click="triggerFileInput"
        />
      </div>
      <UInput
        ref="inputRef"
        id="message"
        v-model="draft"
        class="w-full"
        :placeholder="editTarget ? 'Edit message…' : 'Type a message'"
        size="xl"
        aria-label="Message text"
        autocomplete="off"
        :ui="{ base: 'border-0 ring-0 shadow-none outline-none focus:ring-0 focus:outline-none bg-transparent' }"
        :style="{ color: 'var(--chat-text)' }"
        @input="emit('typing')"
        @keydown.enter.prevent="handleSubmit"
      />
      <div class="attach-btn-square p-1">
      <UButton
        :icon="editTarget ? 'i-lucide-check' : 'i-lucide-send'"
        color="primary"
        variant="soft"
        class="size-full min-w-0 min-h-0 rounded-sm w-full h-full flex align-center justify-center"
        type="submit"
        :aria-label="editTarget ? 'Save changes' : 'Send message'"
      />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import ReplyPreviewBanner from '@/components/molecules/ReplyPreviewBanner.vue';
import { useAuthStore } from '@/stores/auth';
import type { ReplyTo } from '@/types/chat';
import { lo } from '@nuxt/ui/runtime/locale/index.js';
import { log } from 'console';
import { ref, watch } from 'vue';

const props = defineProps<{
  replyTo?: ReplyTo | null
  editTarget?: { id: string; text: string } | null
}>()

const emit = defineEmits<{
  send: [text: string]
  'send-media': [url: string]
  'update-message': [id: string, text: string]
  'cancel-reply': []
  'cancel-edit': []
  typing: []
}>()

const auth = useAuthStore()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const draft = ref('')
const inputRef = ref<{ $el: HTMLElement } | null>(null)

watch(
  () => props.editTarget,
  (target) => {
    if (target) draft.value = target.text
  },
  { immediate: true },
)

function cancelEdit() {
  draft.value = ''
  emit('cancel-edit')
}

function handleSubmit() {
  const text = draft.value.trim()
  if (!text) return

  if (props.editTarget) {
    emit('update-message', props.editTarget.id, text)
    draft.value = ''
    emit('cancel-edit')
  } else {
    emit('send', text)
    draft.value = ''
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)


    const res = await fetch('/media/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: form,
    })
    const data = await res.json()

    console.log('[ChatComposer] upload response:', { res, data })

    if (!res.ok) throw new Error(data.error ?? 'Upload failed')
    // Remap MinIO URL to local proxy
    const url = (data.url as string).replace('http://localhost:9000', '/media-files')
    emit('send-media', url)
  } catch (err) {
    console.error('[ChatComposer] upload failed:', err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function focus() {
  const el = inputRef.value?.$el
  const input = el?.querySelector('input') ?? el
  input?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.attach-btn-square {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(input) {
  outline: none !important;
  box-shadow: none !important;
}
</style>
