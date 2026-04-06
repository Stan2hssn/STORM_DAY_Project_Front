import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

function loadArchived(): string[] {
  try { return JSON.parse(localStorage.getItem('archived_conversations') || '[]') } catch { return [] }
}

export const useArchiveStore = defineStore('archive', () => {
  const archivedIds = ref<string[]>(loadArchived())

  const archivedSet = computed(() => new Set(archivedIds.value))

  function archiveConversation(id: string) {
    if (!archivedIds.value.includes(id)) {
      archivedIds.value.push(id)
      localStorage.setItem('archived_conversations', JSON.stringify(archivedIds.value))
    }
  }

  function unarchiveConversation(id: string) {
    archivedIds.value = archivedIds.value.filter(i => i !== id)
    localStorage.setItem('archived_conversations', JSON.stringify(archivedIds.value))
  }

  function isArchived(id: string): boolean {
    return archivedSet.value.has(id)
  }

  return { archivedIds, archiveConversation, unarchiveConversation, isArchived }
})
