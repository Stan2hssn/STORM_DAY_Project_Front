<template>
  <div
    class="auth-layout relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-transparent px-4 py-12"
  >
    <div class="absolute top-4 inset-e-4 z-10">
      <UButton
        :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
        color="neutral"
        variant="ghost"
        :aria-label="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
        @click="toggleTheme"
      />
    </div>

    <!-- Same visual shell as other chat panels (CreateConversation, modals) -->
    <div
      ref="cardRef"
      class="chat-shell w-full max-w-md border shadow-2xl"
      :style="{
        borderRadius: '1.25rem',
        backgroundColor: 'var(--chat-shell)',
        borderColor: 'var(--chat-border)',
      }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGsap } from '@/composables/useGsap'
import { useThemeToggle } from '@/composables/useThemeToggle'
import { onMounted, onUnmounted, ref } from 'vue'

const { isDark, toggleTheme } = useThemeToggle()
const gsap = useGsap()
const cardRef = ref<HTMLDivElement | null>(null)
let authTimeline: gsap.core.Timeline | null = null

onMounted(() => {
  const card = cardRef.value
  if (!card) return
  const items = card.querySelectorAll('[data-auth-item]')
  if (!items.length) return
  authTimeline?.kill()
  authTimeline = gsap.timeline()
  authTimeline.set(items, { opacity: 0 })
  authTimeline.to(items, {
    opacity: 1,
    duration: 0.26,
    stagger: 0.08,
    ease: 'power2.out',
  })
})

onUnmounted(() => {
  authTimeline?.kill()
  authTimeline = null
})
</script>
