<template>
  <article
    class="mx-auto flex w-full max-w-5xl items-end gap-2"
    :class="isRight ? 'justify-end' : ''"
    :aria-label="`${message.author} at ${message.time}: ${message.text}`"
  >
    <template v-if="!isRight && isGroup">
      <BaseAvatar
        v-if="isLastInGroup"
        :text="initials"
        size="xs"
        status
        aria-hidden="true"
      />
      <div v-else class="w-6 shrink-0" aria-hidden="true" />
    </template>

    <div
      class="group relative max-w-[78%]"
      @mouseleave="scheduleClose"
    >
      <div
        class="px-3 py-2"
        :style="{
          backgroundColor: isRight ? 'var(--chat-bubble-out)' : 'var(--chat-bubble-in)',
          color: 'var(--chat-text)',
          borderRadius: 'var(--chat-bubble-radius)',
        }"
      >
        <MessageForwardQuote
          v-if="showForwardMention"
          :forward-from="message.forwardFrom"
          @click="onForwardMentionClick"
        />
        <MessageReplyQuote
          v-if="message.replyTo"
          :reply-to="message.replyTo"
          :is-right="isRight"
          @click="$emit('scroll-to', message.replyTo!.id)"
        />

        <p v-if="showAuthor" class="mb-0.5 text-xs">
          <span class="font-medium" style="color: var(--chat-accent)">{{ message.author }}</span>
          <span v-if="message.authorUsername" class="ml-1" style="color: var(--chat-text-muted)">@{{ message.authorUsername }}</span>
        </p>
        <p class="text-sm leading-relaxed">
          {{ message.text }}
          <span
            v-if="message.modified"
            class="ml-1 text-[0.65rem] italic"
            style="color: var(--chat-text-muted)"
            aria-label="Message was edited"
          >(edited)</span>
        </p>
        <MessageStatusBadge
          :time="message.time"
          :status="isRight && isLast ? message.status : null"
        />
      </div>

      <!-- Seen by: only show other users (never show ourselves in the receipt list) -->
      <MessageSeenByAvatars
        v-if="isRight && isLast && isGroup && displayedSeenBy.length"
        :seen-by="displayedSeenBy"
      />

      <!-- Menu anchored to the ⋮ button, not to the bubble -->
      <div
        class="absolute top-1/2 z-[1] -translate-y-1/2"
        :class="isRight ? '-left-8' : '-right-8'"
        @mouseenter="cancelClose"
        @mouseleave="scheduleClose"
      >
        <div class="relative">
          <button
            type="button"
            class="rounded-full p-1 opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)] pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
            :style="{ color: 'var(--chat-text-secondary)' }"
            :aria-expanded="showMenu"
            aria-haspopup="menu"
            aria-label="Message options"
            @click.stop="toggleMenu"
          >
            <UIcon name="i-lucide-more-vertical" class="size-4" />
          </button>
          <div
            v-if="showMenu"
            class="absolute bottom-full z-10 mb-1"
            :class="isRight ? 'right-0' : 'left-0'"
          >
            <MessageOptionsMenu
              :can-edit="canEdit"
              @reply="handleReply"
              @edit="handleEdit"
              @forward="handleForward"
            />
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import BaseAvatar from '@/components/atoms/BaseAvatar.vue';
import MessageStatusBadge from '@/components/atoms/MessageStatusBadge.vue';
import MessageForwardQuote from '@/components/molecules/MessageForwardQuote.vue';
import MessageOptionsMenu from '@/components/molecules/MessageOptionsMenu.vue';
import MessageReplyQuote from '@/components/molecules/MessageReplyQuote.vue';
import MessageSeenByAvatars from '@/components/molecules/MessageSeenByAvatars.vue';
import { useAuthStore } from '@/stores/auth';
import type { Message } from '@/types/chat';
import { computed, ref } from 'vue';

const auth = useAuthStore();

const props = withDefaults(defineProps<{
  message: Message
  isGroup?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  isLast?: boolean
}>(), {
  isGroup: false,
  isFirstInGroup: true,
  isLastInGroup: true,
  isLast: false,
})

const emit = defineEmits<{
  reply: [message: Message]
  edit: [message: Message]
  forward: [message: Message]
  'scroll-to': [messageId: string]
}>()

const initials = computed(() => props.message.author.slice(0, 2).toUpperCase())
const isRight = computed(() => props.message.side === 'right')
const showAuthor = computed(() => !isRight.value && props.isGroup && props.isFirstInGroup)

/** Show the "Forwarded" mention as soon as the message has forward metadata or flag. */
const showForwardMention = computed(
  () => Boolean(props.message.forwardFrom || props.message.isForwarded),
)

function onForwardMentionClick() {
  const id = props.message.forwardFrom?.id
  if (id) emit('scroll-to', id)
}

/** Seen-by receipts: filter out the current user (never show yourself in the list). */
const displayedSeenBy = computed(() => {
  const list = props.message.seenBy ?? [];
  const currentId = auth.user?.id;
  if (!currentId) return list;
  return list.filter((u) => String(u.id) !== String(currentId));
})

const canEdit = computed(() => {
  if (!isRight.value) return false
  const createdAt = new Date(props.message.rawTime).getTime()
  if (Number.isNaN(createdAt)) return false
  const TWO_MINUTES = 2 * 60 * 1000
  return Date.now() - createdAt <= TWO_MINUTES
})

const showMenu = ref(false)
const closeTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const CLOSE_DELAY_MS = 200

function clearCloseTimeout() {
  if (closeTimeout.value != null) {
    clearTimeout(closeTimeout.value)
    closeTimeout.value = null
  }
}

function scheduleClose() {
  clearCloseTimeout()
  closeTimeout.value = setTimeout(() => {
    showMenu.value = false
    closeTimeout.value = null
  }, CLOSE_DELAY_MS)
}

function cancelClose() {
  clearCloseTimeout()
}

function toggleMenu() {
  clearCloseTimeout()
  showMenu.value = !showMenu.value
}

function closeMenu() {
  clearCloseTimeout()
  showMenu.value = false
}

function handleReply() {
  emit('reply', props.message)
  closeMenu()
}

function handleEdit() {
  emit('edit', props.message)
  closeMenu()
}

function handleForward() {
  emit('forward', props.message)
  closeMenu()
}
</script>
