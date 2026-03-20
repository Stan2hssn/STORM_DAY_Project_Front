<template>
  <UApp class="relative min-h-dvh bg-transparent">
    <BackgroundCanvas @canvas-intro-complete="onCanvasIntroComplete" />
    <!-- After the canvas fade-in: fade in the app content (auth + chat) -->
    <div
      ref="appChromeRef"
      class="app-chrome relative z-10 min-h-dvh w-full"
      :class="{ 'pointer-events-none': !contentVisible }"
    >
      <RouterView v-slot="{ Component, route }">
        <!--
          Key + DOM wrapper on a div: Transition must not wrap Suspense alone
          (no DOM root → opacity classes have no effect / blank page).
        -->
        <Transition name="auth-chat" mode="out-in" appear>
          <div :key="route.fullPath" class="auth-chat-route relative min-h-dvh w-full">
            <Suspense>
              <component :is="Component" />
              <template #fallback>
                <div
                  class="flex min-h-dvh w-full items-center justify-center"
                  aria-busy="true"
                  aria-label="Chargement"
                >
                  <UIcon
                    name="i-lucide-loader-2"
                    class="size-9 animate-spin opacity-35"
                    style="color: var(--chat-text-secondary, #888)"
                  />
                </div>
              </template>
            </Suspense>
          </div>
        </Transition>
      </RouterView>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import BackgroundCanvas from '@/components/atoms/BackgroundCanvas.vue';
import { useGsap } from '@/composables/useGsap'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const contentVisible = ref(false)
const appChromeRef = ref<HTMLDivElement | null>(null)
const gsap = useGsap()
let chromeTween: gsap.core.Tween | null = null

async function onCanvasIntroComplete() {
  await nextTick()
  const el = appChromeRef.value
  if (!el) {
    contentVisible.value = true
    return
  }
  gsap.set(el, { opacity: 0 })
  chromeTween = gsap.to(el, {
    opacity: 1,
    duration: 0.5,
    delay: 0.06,
    ease: 'power2.out',
    onComplete: () => {
      contentVisible.value = true
      chromeTween = null
    },
  })
}

onMounted(() => {
  const el = appChromeRef.value
  if (el) gsap.set(el, { opacity: 0 })
  globalThis.setTimeout(() => {
    if (!contentVisible.value) {
      chromeTween?.kill()
      contentVisible.value = true
      if (appChromeRef.value) {
        gsap.set(appChromeRef.value, { opacity: 1 })
      }
    }
  }, 3500)
})

onBeforeUnmount(() => {
  chromeTween?.kill()
})
</script>

<style scoped>
/* Transition auth ↔ chat: opacity only for clean page switch */
.auth-chat-enter-active {
  transition: opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-chat-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.auth-chat-enter-from {
  opacity: 0;
}
.auth-chat-leave-to {
  opacity: 0;
}
</style>
