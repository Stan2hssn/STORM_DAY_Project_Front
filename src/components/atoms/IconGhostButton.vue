<template>
  <UButton :icon="icon" color="neutral" variant="ghost" :ui="{ base: 'text-[#aebac1] hover:bg-[#2a3942]' }" />
</template>

<script setup lang="ts">
defineProps<{
  icon: string
}>()
</script>