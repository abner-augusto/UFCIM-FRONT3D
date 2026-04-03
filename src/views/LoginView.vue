<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const IS_DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true';

// Dev login — backend uses hardcoded staff user for all headerless requests
async function loginAs(_role: string) {
  loading.value = true;
  errorMsg.value = null;
  try {
    if (IS_DEV_AUTH) {
      // Dev auth: no login endpoint — fetch /users/me without Authorization header
      const userData = await api.getMe(null);
      auth.setAuth('dev', {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        registration: userData.registration,
        role: userData.role as any,
      });
    } else {
      const { token } = await api.devLogin(_role);
      const userData = await api.getMe(token);
      auth.setAuth(token, {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        registration: userData.registration,
        role: userData.role as any,
      });
    }
    router.push({ name: 'campus-select' });
  } catch (e) {
    errorMsg.value = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
    console.error('Login failed:', e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <h1>UFCIM</h1>
      <p>Reserva de Espaços — UFC</p>
      <div class="login-roles">
        <button @click="loginAs('student')" :disabled="loading">Entrar como Estudante</button>
        <button @click="loginAs('professor')" :disabled="loading">Entrar como Professor</button>
        <button @click="loginAs('staff')" :disabled="loading">Entrar como Funcionário</button>
        <button @click="loginAs('maintenance')" :disabled="loading">Entrar como Manutenção</button>
      </div>
      <p v-if="loading" class="login-status">Entrando...</p>
      <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>
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
.login-roles button:hover:not(:disabled) {
  background: #f0f0f0;
}
.login-roles button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-status {
  margin-top: 1rem;
  color: #888;
  font-size: 0.9rem;
}
.login-error {
  margin-top: 1rem;
  color: #c0392b;
  font-size: 0.875rem;
}
</style>
