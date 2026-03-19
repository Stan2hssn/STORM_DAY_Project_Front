<template>
  <div class="relative">
    <UAvatar :text="text" :size="size" />
    <span
      v-if="status"
      class="avatar-status absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  status?: boolean
}>(), {
  size: 'sm',
  status: false
})
</script>

<style scoped>
.avatar-status {
  background-color: var(--chat-accent);
  --tw-ring-color: var(--chat-shell);
}
</style>