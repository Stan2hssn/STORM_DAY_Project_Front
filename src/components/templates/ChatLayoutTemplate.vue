<template>
  <div class="relative flex h-screen flex-col overflow-hidden">
    <!-- Full-width app header — sits above the grid on z-axis -->
    <header
      class="chat-shell relative z-10 shrink-0 border-b px-8 py-4"
      style="border-color: var(--chat-border)"
    >
      <slot name="app-header" />
    </header>

    <!-- Main grid: sidebar (left) + chat area (right) -->
    <main
      class="relative mx-auto grid min-h-0 flex-1 w-full max-w-[1680px] overflow-hidden md:grid-cols-[420px_1fr]"
      style="grid-template-rows: auto 1fr"
    >
      <!-- Left: sidebar spans both rows -->
      <div
        class="row-span-2 flex min-h-0 flex-col overflow-hidden border-r"
        :class="mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'"
        style="border-color: var(--chat-border)"
      >
        <slot name="sidebar" />
      </div>

      <!-- Top-right: chat header -->
      <div
        class="px-6 py-5"
        :class="mobileView === 'thread' ? '' : 'hidden md:block'"
      >
        <slot name="chat-header" />
      </div>

      <!-- Bottom-right: chat thread -->
      <div
        class="min-h-0 flex flex-col overflow-hidden px-4 pb-5"
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
