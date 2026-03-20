<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style="background-color: var(--chat-modal-overlay)"
      aria-modal="true"
      role="dialog"
      aria-labelledby="settings-modal-title"
      @click.self="$emit('close')"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-2xl border shadow-xl"
        :style="{
          backgroundColor: 'var(--chat-surface)',
          borderColor: 'var(--chat-border)',
          boxShadow: '0 24px 64px var(--chat-shell-shadow)',
        }"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-6 py-5" :style="{ borderColor: 'var(--chat-border)' }">
          <div class="flex items-center gap-3">
            <div
              class="flex size-9 items-center justify-center rounded-xl"
              style="background-color: var(--chat-surface-hover)"
            >
              <UIcon name="i-lucide-settings" class="size-4.5" style="color: var(--chat-text-secondary)" />
            </div>
            <h3 id="settings-modal-title" class="text-base font-semibold" style="color: var(--chat-text)">
              Account settings
            </h3>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Close settings"
            @click="$emit('close')"
          />
        </div>

        <!-- Scrollable body -->
        <div class="max-h-[70vh] overflow-y-auto chat-scroll">

          <!-- ── Profile ────────────────────────────────────── -->
          <section aria-labelledby="section-profile" class="px-6 py-5">
            <p id="section-profile" class="mb-5 text-xs font-semibold uppercase tracking-wide" style="color: var(--chat-text-secondary)">
              Profile
            </p>

            <!-- Avatar + identity -->
            <div class="mb-5 flex items-center gap-4">
              <BaseAvatar
                :text="auth.user?.display_name.slice(0, 2).toUpperCase() ?? '?'"
                size="xl"
              />
              <div class="min-w-0">
                <p class="truncate text-base font-medium" style="color: var(--chat-text)">
                  {{ auth.user?.display_name }}
                </p>
                <p class="text-sm" style="color: var(--chat-text-secondary)">@{{ auth.user?.username }}</p>
              </div>
            </div>

            <UForm
              :state="profileState"
              :validate="validateProfile"
              class="space-y-4"
              @submit="handleSaveProfile"
            >
              <UFormField name="displayName" label="Display name" required>
                <UInput
                  v-model="profileState.displayName"
                  placeholder="Your display name"
                  autocomplete="name"
                  :disabled="savingProfile"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="username" label="Username">
                <UInput
                  :model-value="auth.user?.username ?? ''"
                  autocomplete="username"
                  disabled
                  class="w-full"
                  style="opacity: 0.5"
                />
              </UFormField>

              <UFormField name="email" label="Email">
                <UInput
                  :model-value="auth.user?.email ?? ''"
                  type="email"
                  autocomplete="email"
                  disabled
                  class="w-full"
                  style="opacity: 0.5"
                />
              </UFormField>

              <p v-if="profileError" role="alert" class="text-sm" style="color: red">{{ profileError }}</p>
              <p v-if="profileSuccess" role="status" class="text-sm" style="color: var(--chat-accent)">Profile updated.</p>

              <div class="flex justify-end pt-1">
                <UButton
                  type="submit"
                  size="sm"
                  :loading="savingProfile"
                  :disabled="savingProfile"
                >
                  Save profile
                </UButton>
              </div>
            </UForm>
          </section>

          <div class="border-t" :style="{ borderColor: 'var(--chat-border)' }" role="separator" />

          <!-- ── Security ───────────────────────────────────── -->
          <section aria-labelledby="section-security" class="px-6 py-5">
            <p id="section-security" class="mb-5 text-xs font-semibold uppercase tracking-wide" style="color: var(--chat-text-secondary)">
              Security
            </p>

            <UForm
              :state="passwordState"
              :validate="validatePassword"
              class="space-y-4"
              @submit="handleSavePassword"
            >
              <UFormField name="currentPassword" label="Current password" required>
                <UInput
                  v-model="passwordState.currentPassword"
                  :type="showCurrentPw ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  :disabled="savingPassword"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      :icon="showCurrentPw ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      variant="link"
                      color="neutral"
                      size="sm"
                      tabindex="-1"
                      :aria-label="showCurrentPw ? 'Hide current password' : 'Show current password'"
                      @click="showCurrentPw = !showCurrentPw"
                    />
                  </template>
                </UInput>
              </UFormField>

              <UFormField name="newPassword" label="New password" required>
                <UInput
                  v-model="passwordState.newPassword"
                  :type="showNewPw ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="savingPassword"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      :icon="showNewPw ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      variant="link"
                      color="neutral"
                      size="sm"
                      tabindex="-1"
                      :aria-label="showNewPw ? 'Hide new password' : 'Show new password'"
                      @click="showNewPw = !showNewPw"
                    />
                  </template>
                </UInput>
              </UFormField>

              <UFormField name="confirmPassword" label="Confirm new password" required>
                <UInput
                  v-model="passwordState.confirmPassword"
                  :type="showConfirmPw ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="savingPassword"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      :icon="showConfirmPw ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      variant="link"
                      color="neutral"
                      size="sm"
                      tabindex="-1"
                      :aria-label="showConfirmPw ? 'Hide confirm password' : 'Show confirm password'"
                      @click="showConfirmPw = !showConfirmPw"
                    />
                  </template>
                </UInput>
              </UFormField>

              <p v-if="passwordError" role="alert" class="text-sm" style="color: red">{{ passwordError }}</p>
              <p v-if="passwordSuccess" role="status" class="text-sm" style="color: var(--chat-accent)">Password updated.</p>

              <div class="flex justify-end pt-1">
                <UButton
                  type="submit"
                  size="sm"
                  :loading="savingPassword"
                  :disabled="savingPassword"
                >
                  Update password
                </UButton>
              </div>
            </UForm>
          </section>
        </div>

        <!-- Footer -->
        <div class="border-t px-6 py-4" :style="{ borderColor: 'var(--chat-border)' }">
          <UButton color="neutral" variant="ghost" block @click="$emit('close')">
            Close
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { reactive, ref } from 'vue'

defineEmits<{ close: [] }>()

const auth = useAuthStore()

// ── Profile ────────────────────────────────────────────────────
const profileState = reactive({ displayName: auth.user?.display_name ?? '' })
const savingProfile = ref(false)
const profileError = ref('')
const profileSuccess = ref(false)

type FormError = { name: string; message: string }

function validateProfile(state: typeof profileState): FormError[] {
  const errors: FormError[] = []
  if (!state.displayName.trim()) {
    errors.push({ name: 'displayName', message: 'Display name is required' })
  }
  return errors
}

async function handleSaveProfile() {
  savingProfile.value = true
  profileError.value = ''
  profileSuccess.value = false
  try {
    await auth.updateProfile(profileState.displayName.trim())
    profileState.displayName = auth.user?.display_name ?? profileState.displayName
    profileSuccess.value = true
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Failed to save profile'
  } finally {
    savingProfile.value = false
  }
}

// ── Password ───────────────────────────────────────────────────
const passwordState = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const showCurrentPw = ref(false)
const showNewPw = ref(false)
const showConfirmPw = ref(false)
const savingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

function validatePassword(state: typeof passwordState): FormError[] {
  const errors: FormError[] = []
  if (!state.currentPassword) {
    errors.push({ name: 'currentPassword', message: 'Current password is required' })
  }
  if (state.newPassword.length < 8) {
    errors.push({ name: 'newPassword', message: 'At least 8 characters required' })
  }
  if (state.newPassword !== state.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match' })
  }
  return errors
}

async function handleSavePassword() {
  savingPassword.value = true
  passwordError.value = ''
  passwordSuccess.value = false
  try {
    await auth.updatePassword(passwordState.currentPassword, passwordState.newPassword)
    passwordState.currentPassword = ''
    passwordState.newPassword = ''
    passwordState.confirmPassword = ''
    passwordSuccess.value = true
  } catch (err) {
    passwordError.value = err instanceof Error ? err.message : 'Failed to update password'
  } finally {
    savingPassword.value = false
  }
}
</script>
