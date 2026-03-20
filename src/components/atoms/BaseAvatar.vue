<template>
  <div class="relative h-auto aspect-square" :class="sizeClass">
    <UAvatar :text="text" :size="size" class="rounded-md size-full min-h-10 min-w-10" />
    <span
      v-if="status"
      class="avatar-status absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-md ring-2"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  text: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: boolean
}>(), {
  size: 'sm',
  status: false,
})

// UAvatar sizes from Nuxt UI theme: xs=h-6 sm=h-7 md=h-8 lg=h-9 xl=h-10
// This default height is overridden by `h-full` when passed from the parent
// (e.g. profile button with `class="h-full aspect-square"`).
const sizeMap: Record<NonNullable<typeof props.size>, string> = {
  xs: 'h-6',
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
  xl: 'h-10',
}

const sizeClass = computed(() => sizeMap[props.size])
</script>

<style scoped>
.avatar-status {
  background-color: var(--chat-accent);
  --tw-ring-color: var(--chat-shell);
}
</style>
