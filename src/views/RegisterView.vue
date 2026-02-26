<template>
  <div class="min-h-screen flex items-center justify-center" style="background: #0b141a;">
    <div class="w-full max-w-sm p-8 rounded-2xl shadow-xl" style="background: #111b21;">
      <h1 class="text-2xl font-bold text-center mb-8" style="color: #e9edef;">Créer un compte</h1>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm" style="color: #8696a0;">Nom d'utilisateur <span class="text-xs">(unique, a-z 0-9 _ -)</span></label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            pattern="^[a-z0-9_-]{3,20}$"
            title="3-20 caractères, minuscules, chiffres, _ ou -"
            class="px-4 py-2 rounded-lg outline-none border focus:border-[#00a884] transition-colors"
            style="background: #202c33; border-color: #374045; color: #e9edef;"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm" style="color: #8696a0;">Nom affiché</label>
          <input
            v-model="display_name"
            type="text"
            required
            autocomplete="name"
            minlength="2"
            maxlength="50"
            class="px-4 py-2 rounded-lg outline-none border focus:border-[#00a884] transition-colors"
            style="background: #202c33; border-color: #374045; color: #e9edef;"
          />
        </div>

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
            autocomplete="new-password"
            minlength="8"
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
          {{ loading ? 'Création...' : 'Créer le compte' }}
        </button>
      </form>

      <p class="text-center mt-6 text-sm" style="color: #8696a0;">
        Déjà un compte ?
        <router-link to="/login" style="color: #00a884;" class="hover:underline">Se connecter</router-link>
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

const username = ref('')
const display_name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(username.value, display_name.value, email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de l\'inscription'
  } finally {
    loading.value = false
  }
}
</script>
