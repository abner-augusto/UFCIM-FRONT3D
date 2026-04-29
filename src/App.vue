<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import BottomTabBar from './components/BottomTabBar.vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
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
  min-height: 100dvh;
  min-height: 100vh; /* fallback */
  padding-top: var(--top-bar-h);
  padding-bottom: 0;
}

@media (max-width: 1023px) {
  .app-main {
    padding-bottom: calc(var(--bottom-bar-h) + var(--safe-bottom));
  }
}
</style>
