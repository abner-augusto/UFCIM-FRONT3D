<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';
import { mapLoginError } from '@/utils/api-errors';
import type { UserRole } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const showForgotInfo = ref(false);

const email = ref('');
const password = ref('');

async function handleLogin() {
  if (!email.value || !password.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    const { accessToken, refreshToken, user } = await api.login({ email: email.value, password: password.value });
    auth.setAuth(accessToken, refreshToken, {
      id: user.id,
      name: user.name,
      email: user.email,
      registration: user.registration,
      role: user.role as UserRole,
      isMasterAdmin: user.isMasterAdmin,
    }, user.unreadCount ?? 0);
    router.push({ name: 'campus-select' });
  } catch (e) {
    errorMsg.value = mapLoginError(e);
  } finally {
    loading.value = false;
  }
}


</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <h1>UFCIM</h1>
      <p class="login-subtitle">Reserva de Espaços — UFC</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <label class="login-field">
          <span>Email</span>
          <input
            v-model="email"
            type="email"
            placeholder="seu@email.com"
            autocomplete="email"
            required
            :disabled="loading"
          />
        </label>

        <label class="login-field">
          <span>Senha</span>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••••"
            autocomplete="current-password"
            required
            :disabled="loading"
          />
        </label>

        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <button class="forgot-link" @click="showForgotInfo = !showForgotInfo">
        Esqueci minha senha
      </button>
      <p v-if="showForgotInfo" class="forgot-info">
        Entre em contato com o administrador para redefinir sua senha.
      </p>

    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f7f7f7;
}

@supports (min-height: 100dvh) {
  .login-view {
    min-height: 100dvh;
  }
}

.login-view input,
.login-view .login-btn {
  min-height: var(--tap-min, 44px);
}

.login-card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.login-card h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  color: #1D9E75;
}
.login-subtitle {
  margin: 0 0 1.75rem;
  color: #888;
  font-size: 0.9rem;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  text-align: left;
}
.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.875rem;
  color: #555;
  font-weight: 500;
}
.login-field input {
  padding: 0.65rem 0.875rem;
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}
.login-field input:focus {
  border-color: #1D9E75;
}
.login-field input:disabled {
  background: #f5f5f5;
  color: #aaa;
}
.login-btn {
  margin-top: 0.25rem;
  padding: 0.75rem;
  background: #1D9E75;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.login-btn:hover:not(:disabled) {
  background: #178a64;
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-error {
  color: #c0392b;
  font-size: 0.875rem;
  margin: 0;
}
.forgot-link {
  display: block;
  margin-top: 1rem;
  background: none;
  border: none;
  color: #888;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  min-height: var(--tap-min, 44px);
}
.forgot-link:hover {
  color: #555;
}
.forgot-info {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #555;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 0.6rem 0.875rem;
  text-align: left;
}
</style>
