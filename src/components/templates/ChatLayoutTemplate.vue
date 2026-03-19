<template>
  <div class="relative h-screen overflow-hidden">
    <main class="chat-shell relative mx-auto grid h-full w-full max-w-[1680px] overflow-hidden"
      :class="mobileView === 'sidebar' ? 'grid-cols-1 md:grid-cols-[420px_1fr]' : 'grid-cols-1 md:grid-cols-[420px_1fr]'"
      style="grid-template-rows: auto 1fr"
    >
      <!-- Top-left: sidebar header -->
      <div
        class="px-4 py-4"
        :class="mobileView === 'sidebar' ? '' : 'hidden md:block'"
      >
        <slot name="sidebar-header" />
      </div>

      <!-- Top-right: chat header -->
      <div
        class="px-4 py-4"
        :class="mobileView === 'thread' ? '' : 'hidden md:block'"
      >
        <slot name="chat-header" />
      </div>

      <!-- Bottom-left: conversation list -->
      <div
        class="min-h-0 flex flex-col overflow-hidden px-3"
        :class="mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'"
      >
        <slot name="sidebar-body" />
      </div>

      <!-- Bottom-right: chat thread -->
      <div
        class="min-h-0 flex flex-col overflow-hidden px-3 pb-3"
        :class="mobileView === 'thread' ? 'flex' : 'hidden md:flex'"
      >
        <slot name="chat-body" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  activeConversationId: string | null
}>()

const mobileView = ref<'sidebar' | 'thread'>(
  props.activeConversationId ? 'thread' : 'sidebar',
)

function selectThread() {
  mobileView.value = 'thread'
}

function backToSidebar() {
  mobileView.value = 'sidebar'
}

defineExpose({ selectThread, backToSidebar })
</script>
