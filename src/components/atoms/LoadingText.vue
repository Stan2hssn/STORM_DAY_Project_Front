<template>
  <output class="block py-8 text-center text-sm" style="color: var(--chat-text-secondary)">
    {{ text }}
  </output>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
}>(), {
  text: 'Loading...',
})
</script>
