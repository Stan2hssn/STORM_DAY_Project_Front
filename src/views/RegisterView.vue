<template>
  <AuthLayoutTemplate>
    <div class="chat-scroll max-h-[min(90dvh,calc(100dvh-6rem))] space-y-8 overflow-y-auto p-8">
      <header class="space-y-1 text-center" data-auth-item>
        <h1 class="text-2xl font-semibold tracking-tight" :style="{ color: 'var(--chat-text)' }">
          Créer un compte
        </h1>
        <p class="text-sm" :style="{ color: 'var(--chat-text-muted)' }">
          Rejoins STORM en quelques champs
        </p>
      </header>

      <form class="flex flex-col gap-5" data-auth-item @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-1.5">
          <label
            for="auth-register-username"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Nom d'utilisateur
            <span class="font-normal" :style="{ color: 'var(--chat-text-muted)' }">
              (unique, a-z 0-9 _ -)
            </span>
          </label>
          <UInput
            id="auth-register-username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            size="xl"
            placeholder="storm_user"
            pattern="^[a-z0-9_-]{3,20}$"
            title="3-20 caractères, minuscules, chiffres, _ ou -"
            :ui="{ base: 'ring-transparent' }"
            :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="auth-register-display"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Nom affiché
          </label>
          <UInput
            id="auth-register-display"
            v-model="displayName"
            type="text"
            required
            autocomplete="name"
            minlength="2"
            maxlength="50"
            size="xl"
            placeholder="Ton prénom"
            :ui="{ base: 'ring-transparent' }"
            :style="{ backgroundColor: 'var(--chat-surface)', color: 'var(--chat-text)' }"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="auth-register-email"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Email
          </label>
          <UInput
            id="auth-register-email"
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
            for="auth-register-password"
            class="text-sm font-medium"
            :style="{ color: 'var(--chat-text-secondary)' }"
          >
            Mot de passe
          </label>
          <UInput
            id="auth-register-password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            minlength="8"
            size="xl"
            placeholder="Au moins 8 caractères"
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
          :label="loading ? 'Création…' : 'Créer le compte'"
        />
      </form>

      <p class="text-center text-sm" data-auth-item :style="{ color: 'var(--chat-text-muted)' }">
        Déjà un compte ?
        <RouterLink
          to="/login"
          class="font-medium underline-offset-2 hover:underline"
          :style="{ color: 'var(--chat-accent)' }"
        >
          Se connecter
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

const username = ref('')
const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(username.value, displayName.value, email.value, password.value)
    await import('@/views/ChatView.vue')
    await router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur lors de l\'inscription'
  } finally {
    loading.value = false
  }
}
</script>
