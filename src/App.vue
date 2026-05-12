<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import BottomTabBar from './components/BottomTabBar.vue';
import { useAuthStore } from './stores/auth';
import { api } from './services/api';
import { onMounted, onUnmounted, watch } from 'vue';

const auth = useAuthStore();
const route = useRoute();

let pollTimer: ReturnType<typeof setInterval> | null = null;

watch(() => route.path, () => {
  refreshUnreadCount();
});

async function refreshUnreadCount() {
  if (!auth.token) return;
  try {
    const me = await api.getMe(auth.token);
    auth.setUnreadCount(me.unreadCount);
  } catch {
    // Silently fail — the refresh token flow handles 401s
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshUnreadCount();
  }
}

onMounted(() => {
  // Poll every 60s
  refreshUnreadCount();
  pollTimer = setInterval(refreshUnreadCount, 60_000);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <AppHeader v-if="auth.isAuthenticated" />
  <main class="app-main">
    <RouterView />
  </main>
  <BottomTabBar v-if="auth.isAuthenticated" />
</template>

<style scoped>
.app-main {
  min-height: 100vh; /* fallback */
  min-height: 100dvh;
  padding-top: var(--header-offset);
  padding-bottom: 0;
}

@media (max-width: 1023px) {
  .app-main {
    padding-bottom: calc(var(--bottom-bar-h) + var(--safe-bottom));
  }
}
</style>
