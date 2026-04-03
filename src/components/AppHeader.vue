<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <router-link to="/campus" class="header-logo">UFCIM</router-link>
    </div>
    <nav class="header-nav">
      <router-link to="/minhas-reservas">Minhas Reservas</router-link>
      <router-link to="/notificacoes">Notificações</router-link>
    </nav>
    <div class="header-right">
      <span class="header-user">{{ auth.user?.name }}</span>
      <button @click="logout" class="header-logout">Sair</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: #1D9E75;
  text-decoration: none;
}
.header-nav {
  display: flex;
  gap: 1.5rem;
}
.header-nav a {
  text-decoration: none;
  color: #555;
  font-size: 0.9rem;
}
.header-nav a.router-link-active {
  color: #1D9E75;
  font-weight: 500;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-user {
  font-size: 0.85rem;
  color: #777;
}
.header-logout {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
}
</style>
