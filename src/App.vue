<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import BottomTabBar from './components/BottomTabBar.vue';
import { useAuthStore } from './stores/auth';
import { api } from './services/api';
import { onMounted, onUnmounted, watch } from 'vue';
import { useDarkMode } from './composables/useDarkMode';

const auth = useAuthStore();
const route = useRoute();
useDarkMode();

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
  <main class="app-main bg-background text-foreground">
    <RouterView v-slot="{ Component }">
      <Transition name="page">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <BottomTabBar v-if="auth.isAuthenticated" />
</template>

<style scoped>
.app-main {
  position: relative; /* containing block for the leaving page during route crossfade */
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

/* Page route transitions — a parallel crossfade: the entering page rises into
   place while the outgoing one fades up. The leaving page is taken out of flow
   (absolute, pinned to the content box below the header) so the two overlap
   without the layout jumping or scroll height collapsing mid-transition. */
.page-enter-active {
  transition: opacity 220ms var(--ease-out-expo, ease), transform 220ms var(--ease-out-expo, ease);
}
.page-leave-active {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
  position: absolute;
  top: var(--header-offset);
  left: 0;
  right: 0;
  bottom: 0;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
