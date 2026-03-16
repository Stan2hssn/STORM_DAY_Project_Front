<template>
  <UButton :icon="icon" color="neutral" variant="ghost" :ui="{ base: 'text-[#aebac1] hover:bg-[#2a3942]' }" @click="emit('click')" />
</template>

<script setup lang="ts">
defineProps<{
  icon: string
}>()

const emit = defineEmits<{ click: [] }>()
</script>