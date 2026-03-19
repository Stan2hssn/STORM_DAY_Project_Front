<template>
  <div
    class="mb-1 flex min-w-0 items-center gap-1.5 text-left"
    :class="canNavigate ? 'cursor-pointer transition-opacity hover:opacity-90' : ''"
    :role="canNavigate ? 'button' : undefined"
    :tabindex="canNavigate ? 0 : undefined"
    :aria-label="ariaLabel"
    @click="onClick"
    @keydown.enter.prevent="onClick"
    @keydown.space.prevent="onClick"
  >
    <UIcon
      name="i-lucide-forward"
      class="size-3.5 shrink-0 opacity-90"
      style="color: var(--chat-text-secondary)"
      aria-hidden="true"
    />
    <span class="text-[0.75rem] italic leading-none" style="color: var(--chat-text-secondary)">
      Transféré
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ForwardFrom } from '@/types/chat'
import { computed } from 'vue'

const props = defineProps<{
  /** Optionnel : si absent, la mention s’affiche quand même (pas de scroll vers l’origine). */
  forwardFrom?: ForwardFrom | null
}>()

const emit = defineEmits<{
  click: []
}>()

const canNavigate = computed(() => Boolean(props.forwardFrom?.id))

const ariaLabel = computed(() => {
  if (props.forwardFrom?.author) {
    return `Message transféré. Aller au message d’origine de ${props.forwardFrom.author}.`
  }
  return 'Message transféré'
})

function onClick() {
  if (canNavigate.value) emit('click')
}
</script>
