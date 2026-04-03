import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

function loadBlocked(): string[] {
  try { return JSON.parse(localStorage.getItem('blocked_users') || '[]') } catch { return [] }
}

export const useBlockStore = defineStore('block', () => {
  const blockedIds = ref<string[]>(loadBlocked())

  const blockedSet = computed(() => new Set(blockedIds.value))

  function blockUser(userId: string) {
    if (!blockedIds.value.includes(userId)) {
      blockedIds.value.push(userId)
      localStorage.setItem('blocked_users', JSON.stringify(blockedIds.value))
    }
  }

  function unblockUser(userId: string) {
    blockedIds.value = blockedIds.value.filter(id => id !== userId)
    localStorage.setItem('blocked_users', JSON.stringify(blockedIds.value))
  }

  function isBlocked(userId: string): boolean {
    return blockedSet.value.has(userId)
  }

  return { blockedIds, blockUser, unblockUser, isBlocked }
})
