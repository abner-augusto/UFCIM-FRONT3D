<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';

const auth = useAuthStore();
const router = useRouter();

// Dev login — will be replaced with Keycloak
async function loginAs(role: string) {
  try {
    const { token } = await api.devLogin(role);
    const userData = await api.getMe(token);
    auth.setAuth(token, {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      registration: userData.registration,
      role: userData.role as any,
    });
    router.push({ name: 'campus-select' });
  } catch (e) {
    console.error('Login failed:', e);
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <h1>UFCIM</h1>
      <p>Reserva de Espaços — UFC</p>
      <div class="login-roles">
        <button @click="loginAs('student')">Entrar como Estudante</button>
        <button @click="loginAs('professor')">Entrar como Professor</button>
        <button @click="loginAs('staff')">Entrar como Funcionário</button>
        <button @click="loginAs('maintenance')">Entrar como Manutenção</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.login-card {
  text-align: center;
  padding: 2rem;
}
.login-roles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}
.login-roles button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
}
.login-roles button:hover {
  background: #f0f0f0;
}
</style>
