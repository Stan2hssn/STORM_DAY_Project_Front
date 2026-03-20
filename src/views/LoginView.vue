<template>
  <AuthLayoutTemplate>
    <div class="space-y-8 p-8">
      <header class="space-y-1 text-center" data-auth-item>
        <h1 class="text-2xl font-semibold tracking-tight" :style="{ color: 'var(--chat-text)' }">
          STORM
        </h1>
        <p class="text-sm" :style="{ color: 'var(--chat-text-muted)' }">
          Connexion à ton espace
        </p>
      </header>

      <form class="flex flex-col gap-5" data-auth-item @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-1.5">
          <label
            for="auth-login-email"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Email
          </label>
          <UInput
            id="auth-login-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            size="xl"
            placeholder="toi@exemple.com"
            :ui="{ base: 'ring-transparent' }"
            :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="auth-login-password"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Mot de passe
          </label>
          <UInput
            id="auth-login-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            size="xl"
            placeholder="••••••••"
            :ui="{ base: 'ring-transparent' }"
            :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            class="w-full"
          />
        </div>

        <p
          v-if="error"
          class="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-center text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ error }}
        </p>

        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="loading"
          :label="loading ? 'Connexion…' : 'Se connecter'"
        />
      </form>

      <p class="text-center text-sm" data-auth-item :style="{ color: 'var(--chat-text-muted)' }">
        Pas de compte ?
        <RouterLink
          to="/register"
          class="font-medium underline-offset-2 hover:underline"
          :style="{ color: 'var(--chat-accent)' }"
        >
          S'inscrire
        </RouterLink>
      </p>
    </div>
  </AuthLayoutTemplate>
</template>

<script setup lang="ts">
import AuthLayoutTemplate from '@/components/templates/AuthLayoutTemplate.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await import('@/views/ChatView.vue')
    await router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de connexion'
  } finally {
    loading.value = false
  }
}
</script>
