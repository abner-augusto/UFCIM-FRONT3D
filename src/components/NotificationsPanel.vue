1|<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { X } from 'lucide-vue-next';
import type { Notification } from '@/types/reservation';

const props = defineProps<{
  open: boolean;
  anchor?: 'bottom' | 'top';
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const auth = useAuthStore();

const PREVIEW_LIMIT = 5;

const notifications = ref<Notification[]>([]);
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const markingAll = ref(false);
const loaded = ref(false);

async function load() {
  if (loaded.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    notifications.value = await api.getNotifications(auth.token);
    auth.clearUnreadCount();
    loaded.value = true;
  } catch {
    errorMsg.value = 'Não foi possível carregar as notificações.';
  } finally {
    loading.value = false;
  }
}

async function markRead(id: string) {
  try {
    await api.markNotificationRead(auth.token, id);
    const n = notifications.value.find((n) => n.id === id);
    if (n) n.read = true;
  } catch {
    errorMsg.value = 'Erro ao marcar notificação como lida.';
  }
}

async function markAllRead() {
  markingAll.value = true;
  try {
    await api.markAllRead(auth.token);
    notifications.value.forEach((n) => (n.read = true));
    auth.clearUnreadCount();
  } catch {
    errorMsg.value = 'Erro ao marcar todas como lidas.';
  } finally {
    markingAll.value = false;
  }
}

const dateLabel = (iso: string) => {
  const normalized = iso ? iso.replace(' ', 'T') : '';
  const d = new Date(normalized);
  if (!normalized || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const hasUnread = () => notifications.value.some((n) => !n.read);

const previewNotifications = computed(() => notifications.value.slice(0, PREVIEW_LIMIT));
const hasMore = computed(() => notifications.value.length > PREVIEW_LIMIT);

function viewAll() {
  emit('close');
  router.push({ name: 'notifications' });
}

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('notif-backdrop')) {
    emit('close');
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));

// Load when panel first opens
watch(() => props.open, (val) => {
  if (val) load();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="notif">
    <div
      v-if="open"
      class="notif-backdrop"
      :class="`notif-backdrop--${anchor ?? 'bottom'}`"
      @click="onBackdropClick"
    >
      <div
        class="notif-panel"
        :class="`notif-panel--${anchor ?? 'bottom'}`"
        role="dialog"
        aria-label="Notificações"
      >
        <!-- Header -->
        <div class="notif-panel__header">
          <span class="notif-panel__title">Notificações</span>
          <div class="notif-panel__header-actions">
            <button
              v-if="hasUnread()"
              class="notif-panel__mark-all"
              :disabled="markingAll"
              @click="markAllRead"
            >
              {{ markingAll ? 'Marcando...' : 'Marcar todas como lidas' }}
            </button>
            <button class="notif-panel__close" @click="emit('close')" aria-label="Fechar"><X :size="18" /></button>
          </div>
        </div>

        <!-- Body -->
        <div class="notif-panel__body" :class="{ 'notif-panel__body--scroll': !loading && notifications.length > 0 }">
          <div v-if="loading" class="notif-panel__state">Carregando notificações...</div>
          <div v-else-if="errorMsg" class="notif-panel__state notif-panel__state--error">{{ errorMsg }}</div>
          <div v-else-if="notifications.length === 0" class="notif-panel__state notif-panel__state--empty">
            Nenhuma notificação.
          </div>
          <ul v-else class="notif-panel__list">
            <li
              v-for="n in previewNotifications"
              :key="n.id"
              class="notif-panel__item"
              :class="{ 'notif-panel__item--unread': !n.read }"
            >
              <div class="notif-panel__item-content">
                <p class="notif-panel__item-title">{{ n.title }}</p>
                <p class="notif-panel__item-message">{{ n.message }}</p>
                <p class="notif-panel__item-date">{{ dateLabel(n.createdAt) }}</p>
              </div>
              <button
                v-if="!n.read"
                class="notif-panel__mark-read"
                @click="markRead(n.id)"
              >
                Lida
              </button>
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div v-if="!loading && notifications.length > 0" class="notif-panel__footer">
          <button class="notif-panel__view-all" @click="viewAll">
            {{ hasMore ? `Ver todas as notificações (${notifications.length})` : 'Ver todas as notificações' }}
          </button>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notif-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  /* transparent — clicks outside the panel hit the backdrop and close it */
}

/* Panel anchored below the header (desktop / mobile header bell) */
.notif-panel--bottom {
  position: fixed;
  top: var(--header-offset);
  right: 1rem;
  width: min(380px, calc(100vw - 2rem));
}

/* Panel anchored above the bottom tab bar (mobile tab) */
.notif-panel--top {
  position: fixed;
  bottom: calc(var(--bottom-bar-h) + var(--safe-bottom));
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100%;
}

.notif-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - var(--header-offset) - 1rem);
}

.notif-panel--top {
  border-radius: 16px 16px 0 0;
  max-height: 70dvh;
}

.notif-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem 0.85rem 1.1rem;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 0.5rem;
}

.notif-panel__title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #222;
}

.notif-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notif-panel__mark-all {
  font-size: 0.775rem;
  color: var(--color-brand);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}
.notif-panel__mark-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notif-panel__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #999;
  line-height: 1;
  padding: 0.25rem;
  border-radius: 4px;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  display: flex;
  align-items: center;
  justify-content: center;
}
.notif-panel__close:hover { color: #333; }

.notif-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.notif-panel__footer {
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.notif-panel__view-all {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.825rem;
  color: var(--color-brand);
  font-weight: 600;
  text-align: center;
}
.notif-panel__view-all:hover { background: #f8fffe; }

.notif-panel__state {
  padding: 2rem 1rem;
  text-align: center;
  color: #888;
  font-size: 0.875rem;
}
.notif-panel__state--error { color: #c0392b; }

.notif-panel__list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.notif-panel__item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0.875rem;
  border-radius: 8px;
  border: 1px solid #efefef;
  gap: 0.75rem;
}

.notif-panel__item--unread {
  border-color: var(--color-brand);
  background: #f8fffe;
}

.notif-panel__item-content { flex: 1; min-width: 0; }

.notif-panel__item-title {
  margin: 0 0 0.2rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.notif-panel__item-message {
  margin: 0 0 0.25rem;
  color: #555;
  font-size: 0.8rem;
  word-break: break-word;
}

.notif-panel__item-date {
  margin: 0;
  color: #aaa;
  font-size: 0.72rem;
}

.notif-panel__mark-read {
  font-size: 0.725rem;
  color: var(--color-brand);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
  align-self: center;
}

/* ── Notification panel transitions ───────────────────────── */
.notif-enter-active,
.notif-leave-active {
  transition: opacity var(--duration-med, 220ms) ease;
}
.notif-enter-active .notif-panel,
.notif-leave-active .notif-panel {
  transition: transform var(--duration-med, 220ms) var(--ease-out-expo, ease), opacity var(--duration-med, 220ms) ease;
}
.notif-enter-from,
.notif-leave-to {
  opacity: 0;
}
.notif-enter-from .notif-panel--bottom,
.notif-leave-to .notif-panel--bottom {
  transform: translateY(-8px);
  opacity: 0;
}
.notif-enter-from .notif-panel--top,
.notif-leave-to .notif-panel--top {
  transform: translateY(8px);
  opacity: 0;
}


</style>