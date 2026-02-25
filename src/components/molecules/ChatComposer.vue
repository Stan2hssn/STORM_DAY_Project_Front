<template>
  <footer class="border-t border-white/10 bg-[#202c33] p-3 sm:p-4">
    <div class="flex items-center gap-2 rounded-xl border border-white/6 bg-[#2a3942] p-2">
      <UButton icon="i-lucide-plus" color="neutral" variant="ghost" />
      <UInput
        v-model="draft"
        class="w-full"
        placeholder="Type a message"
        size="xl"
        :ui="{ base: 'border-0 ring-0 bg-transparent text-[#d9dee0] placeholder:text-[#75818a]' }"
        @keydown.enter.prevent="handleSend"
      />
      <UButton icon="i-lucide-send" color="primary" variant="soft" class="shrink-0 rounded-full" @click="handleSend" />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  send: [text: string]
}>()

const draft = ref('')

function handleSend() {
  const text = draft.value.trim()
  if (!text) {
    return
  }

  emit('send', text)
  draft.value = ''
}
</script>