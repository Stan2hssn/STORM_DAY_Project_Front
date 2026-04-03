<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl">

          <!-- Header -->
          <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p class="text-base font-semibold text-[#e9edef]">Mon profil</p>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="emit('close')" />
          </div>

          <div class="px-5 py-6 space-y-6">

            <!-- Avatar -->
            <div class="flex flex-col items-center gap-3">
              <div class="relative group cursor-pointer" @click="triggerAvatarInput">
                <div
                  v-if="!previewAvatar && !auth.user?.avatar_url"
                  class="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
                  style="background: #00a884;"
                >
                  {{ initials }}
                </div>
                <img
                  v-else
                  :src="previewAvatar || auth.user?.avatar_url"
                  alt="avatar"
                  class="h-24 w-24 rounded-full object-cover"
                />
                <!-- Overlay upload -->
                <div class="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UIcon name="i-lucide-camera" class="text-xl text-white" />
                  <span class="text-[10px] text-white mt-1">Modifier</span>
                </div>
              </div>
              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
              <p v-if="uploadingAvatar" class="text-xs text-[#8696a0]">Upload en cours…</p>
            </div>

            <!-- Champs -->
            <div class="space-y-4">
              <div>
                <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Nom affiché</label>
                <input
                  v-model="displayName"
                  class="w-full rounded-lg border border-white/20 bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef] outline-none focus:border-[#00a884] transition-colors"
                  placeholder="Ton nom affiché"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Nom d'utilisateur</label>
                <input
                  :value="auth.user?.username"
                  disabled
                  class="w-full rounded-lg border border-white/10 bg-[#1a2530] px-3 py-2 text-sm text-[#8696a0] cursor-not-allowed"
                />
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Email</label>
                <input
                  :value="auth.user?.email"
                  disabled
                  class="w-full rounded-lg border border-white/10 bg-[#1a2530] px-3 py-2 text-sm text-[#8696a0] cursor-not-allowed"
                />
              </div>
            </div>

            <!-- Erreur -->
            <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

            <!-- Actions -->
            <div class="flex gap-2">
              <UButton
                label="Annuler"
                color="neutral"
                variant="ghost"
                block
                @click="emit('close')"
              />
              <UButton
                label="Enregistrer"
                color="primary"
                block
                :loading="saving"
                :disabled="!hasChanges"
                @click="save"
              />
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()

const displayName = ref(auth.user?.display_name ?? '')
const previewAvatar = ref<string | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
const saving = ref(false)
const error = ref('')

const initials = computed(() => (auth.user?.display_name || auth.user?.username || '?').slice(0, 2).toUpperCase())

const hasChanges = computed(() =>
  displayName.value.trim() !== (auth.user?.display_name ?? '') ||
  !!pendingAvatarFile.value
)

watch(() => props.open, (val) => {
  if (val) {
    displayName.value = auth.user?.display_name ?? ''
    previewAvatar.value = null
    pendingAvatarFile.value = null
    error.value = ''
  }
})

function triggerAvatarInput() {
  avatarInput.value?.click()
}

function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingAvatarFile.value = file
  previewAvatar.value = URL.createObjectURL(file)
}

async function uploadAvatar(): Promise<string | null> {
  if (!pendingAvatarFile.value) return null
  uploadingAvatar.value = true
  try {
    const form = new FormData()
    form.append('file', pendingAvatarFile.value)
    const res = await fetch('/media/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: form,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url as string
  } catch {
    return null
  } finally {
    uploadingAvatar.value = false
  }
}

async function save() {
  error.value = ''
  if (!displayName.value.trim()) {
    error.value = 'Le nom affiché ne peut pas être vide.'
    return
  }
  saving.value = true
  try {
    let avatarUrl: string | undefined
    if (pendingAvatarFile.value) {
      const url = await uploadAvatar()
      if (!url) {
        error.value = "Échec de l'upload de l'avatar."
        return
      }
      avatarUrl = url
    }
    await auth.updateProfile(displayName.value.trim(), avatarUrl)
    emit('close')
  } catch {
    error.value = 'Erreur lors de la sauvegarde.'
  } finally {
    saving.value = false
  }
}
</script>
