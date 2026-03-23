<template>
  <div class="min-h-screen flex items-center justify-center" style="background: #0b141a;">
    <div class="w-full max-w-sm p-8 rounded-2xl shadow-xl" style="background: #111b21;">
      <h1 class="text-2xl font-bold text-center mb-8" style="color: #e9edef;">STORM</h1>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm" style="color: #8696a0;">Email</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="px-4 py-2 rounded-lg outline-none border focus:border-[#00a884] transition-colors"
            style="background: #202c33; border-color: #374045; color: #e9edef;"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm" style="color: #8696a0;">Mot de passe</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="px-4 py-2 rounded-lg outline-none border focus:border-[#00a884] transition-colors"
            style="background: #202c33; border-color: #374045; color: #e9edef;"
          />
        </div>

        <p v-if="error" class="text-sm text-red-400 text-center">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="mt-2 py-2 px-4 rounded-lg font-semibold transition-opacity disabled:opacity-50"
          style="background: #00a884; color: #fff;"
        >
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>

        <button
          v-if="isDev"
          type="button"
          class="py-2 px-4 rounded-lg font-semibold border border-dashed text-sm transition-colors"
          style="border-color: #f59e0b88; color: #fbbf24;"
          @click="devBypass"
        >
          ⚡ Accès dev (sans backend)
        </button>
      </form>

      <p class="text-center mt-6 text-sm" style="color: #8696a0;">
        Pas de compte ?
        <router-link to="/register" style="color: #00a884;" class="hover:underline">S'inscrire</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const isDev = import.meta.env.DEV

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}

function devBypass() {
  auth.setTokens('dev-token', 'dev-refresh', {
    id: 'usr-dev',
    username: 'dev',
    display_name: 'Dev User',
    email: 'dev@storm.local',
  })
  router.push('/')
}
</script>
