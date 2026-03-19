import './assets/main.css'

// Theme: follow system preference, allow manual override via localStorage
const savedTheme = localStorage.getItem('theme')
const systemDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches
const prefersDark = savedTheme ? savedTheme === 'dark' : systemDark
document.documentElement.classList.toggle('dark', prefersDark)

// Listen for system preference changes (only if no manual override)
globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.classList.toggle('dark', e.matches)
  }
})

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ui)

app.mount('#app')
