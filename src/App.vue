<template>
  <UApp>
    <BackgroundCanvas />
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in" appear>
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </UApp>
</template>

<script setup lang="ts">
import BackgroundCanvas from '@/components/atoms/BackgroundCanvas.vue';
</script>

<style>
.page-enter-active {
  transition: opacity 0.25s ease-out;
}
.page-leave-active {
  transition: opacity 0.15s ease-in;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
