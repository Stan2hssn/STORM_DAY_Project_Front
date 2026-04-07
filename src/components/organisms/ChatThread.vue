<template>
  <section
    ref="threadRootEl"
    class="flex h-full flex-col overflow-hidden"
    role="log"
    :aria-label="`Conversation with ${chatName}`"
  >
    <div
      ref="scrollEl"
      class="chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4"
      aria-live="polite"
    >
        <template v-if="!loading">
          <SystemMessageText v-if="systemMessage" :message="systemMessage" data-bubble />

          <TransitionGroup
            name="message"
            tag="div"
            class="space-y-1"
          >
            <template v-for="item in threadItems">
              <DateDivider
                v-if="item.type === 'divider'"
                :key="`d-${item.key}`"
                :label="item.label"
                class="my-4 divider-item"
                data-bubble
              />
              <div
                v-else
                :key="`m-${item.key}`"
                :ref="(el) => setMessageRef(item.message.id, el as HTMLElement | null)"
                :class="item.gapClass"
                data-bubble
              >
                <MessageBubble
                  :message="item.message"
                  :is-group="isGroup"
                  :is-first-in-group="isFirstInBatch(item.idx)"
                  :is-last-in-group="isLastInBatch(item.idx)"
                  :is-last="item.idx === messages.length - 1"
                  @reply="handleReply"
                  @edit="handleEdit"
                  @forward="handleForward"
                  @scroll-to="scrollToMessage"
                />
              </div>
            </template>
          </TransitionGroup>
        </template>
      </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <TypingIndicator v-if="typingUsers.length" :users="typingUsers" />
    </Transition>

    <footer class="px-4 pb-4 pt-2">
      <div>
        <ChatComposer
          ref="composerRef"
          :reply-to="replyTo"
          :edit-target="editTarget"
          @send="handleSend"
          @send-media="(url) => emit('send-media', url)"
          @update-message="handleComposerUpdateMessage"
          @cancel-reply="replyTo = null"
          @cancel-edit="editTarget = null"
          @typing="emit('typing')"
        />
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import SystemMessageText from '@/components/atoms/SystemMessageText.vue';
import ChatComposer from '@/components/molecules/ChatComposer.vue';
import DateDivider from '@/components/molecules/DateDivider.vue';
import MessageBubble from '@/components/molecules/MessageBubble.vue';
import TypingIndicator from '@/components/molecules/TypingIndicator.vue';
import { useGsap } from '@/composables/useGsap';
import type { Conversation, Message, ReplyTo } from '@/types/chat';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  messages: Message[]
  conversation: Conversation | null
  chatName: string
  systemMessage: string
  loading: boolean
  isGroup: boolean
  typingUsers: string[]

}>()

const emit = defineEmits<{
  send: [text: string, replyTo?: ReplyTo]
  'send-media': [url: string]
  'update-message': [id: string, text: string]
  'forward-message': [message: Message]
  typing: []
}>()

const TIME_GAP_MS = 2 * 60 * 1000 // 2 minutes

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function formatDayLabel(date: Date): string {
  const now = new Date()
  if (isSameDay(date, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Yesterday'
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
}

const dateDividers = computed(() => {
  const dividers = new Map<number, string>()
  const msgs = props.messages
  if (!msgs.length) return dividers

  const seenDays = new Set<string>()

  for (let i = 0; i < msgs.length; i++) {
    const d = new Date(msgs[i]!.rawTime)
    if (Number.isNaN(d.getTime())) continue

    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (seenDays.has(key)) continue
    seenDays.add(key)

    dividers.set(i, formatDayLabel(d))
  }

  return dividers
})

type ThreadItem =
  | { type: 'divider'; key: string; label: string }
  | { type: 'message'; key: string; message: Message; idx: number; gapClass: string }

const threadItems = computed<ThreadItem[]>(() => {
  const items: ThreadItem[] = []
  const dividers = dateDividers.value
  for (let idx = 0; idx < props.messages.length; idx++) {
    const msg = props.messages[idx]!
    if (dividers.has(idx)) {
      const d = new Date(msg.rawTime)
      const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      items.push({ type: 'divider', key: `divider-${dayKey}`, label: dividers.get(idx)! })
    }
    items.push({
      type: 'message',
      key: msg.id,
      message: msg,
      idx,
      gapClass: hasTimeGap(idx) && !dividers.has(idx) ? 'mt-6' : '',
    })
  }
  return items
})

const replyTo = ref<ReplyTo | null>(null)
const editTarget = ref<{ id: string; text: string } | null>(null)
const messageRefs = ref<Record<string, HTMLElement | null>>({})

function setMessageRef(id: string, el: HTMLElement | null) {
  messageRefs.value[id] = el
}

function handleReply(message: Message) {
  replyTo.value = {
    id: message.id,
    author: message.author,
    text: message.text,
  }
  composerRef.value?.focus()
}

function handleSend(text: string) {
  emit('send', text, replyTo.value ?? undefined)
  replyTo.value = null
}

function handleEdit(message: Message) {
  replyTo.value = null
  editTarget.value = { id: message.id, text: message.text }
  nextTick(() => composerRef.value?.focus())
}

function handleComposerUpdateMessage(id: string, text: string) {
  editTarget.value = null
  emit('update-message', id, text)
}

function handleForward(message: Message) {
  emit('forward-message', message)
}

function scrollToMessage(messageId: string) {
  const el = messageRefs.value[messageId]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('highlight-flash')
  setTimeout(() => el.classList.remove('highlight-flash'), 1500)
}

function hasTimeGap(idx: number): boolean {
  if (idx === 0) return false
  const prev = props.messages[idx - 1]
  const curr = props.messages[idx]
  if (!prev || !curr) return false
  const prevTime = new Date(prev.rawTime).getTime()
  const currTime = new Date(curr.rawTime).getTime()
  if (Number.isNaN(prevTime) || Number.isNaN(currTime)) return false
  return currTime - prevTime > TIME_GAP_MS
}

// Same author, same side, no time gap = same batch
function isSameBatch(a: Message | undefined, b: Message | undefined): boolean {
  if (!a || !b) return false
  if (a.author !== b.author || a.side !== b.side) return false
  const ta = new Date(a.rawTime).getTime()
  const tb = new Date(b.rawTime).getTime()
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false
  return Math.abs(tb - ta) < TIME_GAP_MS
}

function isFirstInBatch(idx: number): boolean {
  return !isSameBatch(props.messages[idx - 1], props.messages[idx])
}

function isLastInBatch(idx: number): boolean {
  return !isSameBatch(props.messages[idx], props.messages[idx + 1])
}

const scrollEl = ref<HTMLElement | null>(null)
const threadRootEl = ref<HTMLElement | null>(null)
const composerRef = ref<InstanceType<typeof ChatComposer> | null>(null)
const gsap = useGsap()
let bubbleTimeline: gsap.core.Timeline | null = null

function scrollToBottom() {
  const el = scrollEl.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}

// Scroll when a new message is appended, but only if the user
// was already near the bottom, to avoid pushing date dividers off-screen.
watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (!newLen || newLen === oldLen) return
    const el = scrollEl.value
    if (!el) return
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
    const NEAR_BOTTOM_PX = 80
    if (distanceToBottom <= NEAR_BOTTOM_PX) {
      nextTick(scrollToBottom)
    }
  },
)
function fadeOut(): Promise<void> {
  return new Promise<void>((resolve) => {
    nextTick().then(() => {
      const root = threadRootEl.value
      if (!root) { resolve(); return }
      bubbleTimeline?.kill()

      const bubbles = root.querySelectorAll('[data-bubble]')
      const targets = Array.from(bubbles)

      // No visible content — hide the scroll container and resolve immediately
      if (!targets.length) {
        if (scrollEl.value) gsap.set(scrollEl.value, { opacity: 0 })
        resolve()
        return
      }

      bubbleTimeline = gsap.timeline({
        onComplete: () => {
          // Hide the scroll container so new DOM elements created by Vue
          // after selectConversation() don't flash at opacity:1 before fadeIn runs
          if (scrollEl.value) gsap.set(scrollEl.value, { opacity: 0 })
          resolve()
        },
      })
      bubbleTimeline.to(targets, {
        opacity: 0,
        duration: 0.28,
        ease: 'power1.in',
      })
    })
  })
}

async function fadeIn() {
  await nextTick()
  const root = threadRootEl.value
  if (!root) return
  bubbleTimeline?.kill()

  // Restore scroll container visibility before animating items inside it
  if (scrollEl.value) gsap.set(scrollEl.value, { opacity: 1 })

  const bubbles = root.querySelectorAll('[data-bubble]')
  if (!bubbles.length) return

  bubbleTimeline = gsap.timeline()
  bubbleTimeline.set(bubbles, { opacity: 0 }, 0)
  bubbleTimeline.to(bubbles, {
    opacity: 1,
    duration: 0.28,
    stagger: 0.02,
    ease: 'power1.out',
  })
}

watch(
  () => props.loading,
  (isLoading) => {
    if (isLoading) return
    nextTick(() => {
      scrollToBottom()
      composerRef.value?.focus()
    })
    void fadeIn()
  },
  { immediate: true },
)

defineExpose({ fadeOut, fadeIn })

onUnmounted(() => {
  bubbleTimeline?.kill()
  bubbleTimeline = null
})
</script>

<style scoped>
/* ─── Message bubble entry ─── */
[data-bubble].message-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-bubble].message-enter-from {
  opacity: 0;
  transform: scale(0.985);
}

/* Smooth displacement when new messages push others up */
.message-move {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-bubble].message-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
  position: absolute;
  width: 100%;
}

[data-bubble].message-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

/* Dividers: no enter/leave animation, only move */
.divider-item.message-enter-active,
.divider-item.message-leave-active {
  transition: none;
}
.divider-item.message-enter-from,
.divider-item.message-leave-to {
  opacity: 1;
  transform: none;
}
.divider-item.message-leave-active {
  position: static;
}

/* ─── Reply-to highlight ─── */
.highlight-flash {
  animation: flash 1s linear;
  border-radius: var(--chat-bubble-radius);
}

@keyframes flash {
  0%, 100% { background-color: transparent; }
  20% { background-color: color-mix(in srgb, var(--chat-accent) 4%, transparent); }
}

</style>
