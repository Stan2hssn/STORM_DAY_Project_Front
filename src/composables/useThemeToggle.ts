import { ref } from 'vue'

// Module-level ref so all consumers stay in sync across the app.
const isDark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

export function useThemeToggle() {
  function toggleTheme() {
    isDark.value = !isDark.value
    const el = document.documentElement
    el.classList.add('theme-transition')
    el.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    globalThis.setTimeout(() => el.classList.remove('theme-transition'), 700)
  }

  return { isDark, toggleTheme }
}
