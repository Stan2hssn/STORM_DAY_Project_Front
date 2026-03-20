<template>
  <div
    class="min-w-[9.5rem] rounded-md border bg-[var(--chat-surface)] text-xs shadow-lg"
    style="border-color: var(--chat-border)"
    role="menu"
    @click.stop
  >
    <MenuItemButton
      v-for="item in items"
      :key="item.event"
      :icon="item.icon"
      :label="item.label"
      @click="emit(item.event as any)"
    />
  </div>
</template>

<script setup lang="ts">
import MenuItemButton from '@/components/atoms/MenuItemButton.vue';
import { computed } from 'vue';

type MenuEvent = 'reply' | 'edit' | 'forward'

interface MenuItemDef {
  icon: string
  label: string
  event: MenuEvent
}

const props = defineProps<{
  canEdit: boolean
}>()

const emit = defineEmits<{
  reply: []
  edit: []
  forward: []
}>()

/** Each menu item is defined by its icon (curved-left = reply, curved-right = forward). */
const items = computed((): MenuItemDef[] => {
  const list: MenuItemDef[] = [
    {
      icon: 'i-lucide-corner-up-left',
      label: 'Reply',
      event: 'reply',
    },
  ]
  if (props.canEdit) {
    list.push({
      icon: 'i-lucide-pencil',
      label: 'Edit',
      event: 'edit',
    })
  }
  list.push({
    icon: 'i-lucide-corner-up-right',
    label: 'Forward…',
    event: 'forward',
  })
  return list
})
</script>
