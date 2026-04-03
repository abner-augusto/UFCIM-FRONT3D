<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
</script>

<template>
  <AppHeader v-if="auth.isAuthenticated" />
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-main {
  min-height: 100vh;
}
</style>
