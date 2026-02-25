<template>
  <div class="relative">
    <UAvatar :text="text" :size="size" />
    <span
      v-if="status"
      class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary-400 ring-2 ring-[#0b111d]"
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