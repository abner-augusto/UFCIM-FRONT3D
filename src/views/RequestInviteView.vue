<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '@/services/api';
import { mapRequestInviteError } from '@/utils/api-errors';

const name = ref('');
const email = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);
const submitted = ref(false);
const turnstileToken = ref('');

let turnstileWidgetId: string | null = null;

onMounted(() => {
  renderTurnstile();
});

onUnmounted(() => {
  if (turnstileWidgetId && window.turnstile) {
    window.turnstile.reset(turnstileWidgetId);
  }
});

function renderTurnstile() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
  if (!siteKey) {
    console.warn('VITE_TURNSTILE_SITE_KEY not set');
    return;
  }

  const el = document.getElementById('turnstile-container');
  if (!el) return;

  const tryRender = () => {
    if (window.turnstile) {
      const id = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (token: string) => {
          turnstileToken.value = token;
        },
        'expired-callback': () => {
          turnstileToken.value = '';
        },
        'error-callback': () => {
          turnstileToken.value = '';
        },
      });
      turnstileWidgetId = id;
    } else {
      setTimeout(tryRender, 200);
    }
  };

  tryRender();
}

function resetTurnstile() {
  if (turnstileWidgetId && window.turnstile) {
    window.turnstile.reset(turnstileWidgetId);
  }
  turnstileToken.value = '';
}

async function handleSubmit() {
  if (!name.value.trim() || !email.value.trim()) return;
  if (!turnstileToken.value) {
    errorMsg.value = 'Por favor, complete a verificação de segurança.';
    return;
  }

  loading.value = true;
  errorMsg.value = null;

  try {
    await api.requestInvitation({
      name: name.value.trim(),
      email: email.value.trim(),
      turnstileToken: turnstileToken.value,
    });
    submitted.value = true;
  } catch (e) {
    errorMsg.value = mapRequestInviteError(e);
    resetTurnstile();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="request-view">
    <!-- Success state -->
    <div v-if="submitted" class="request-card success-card">
      <div class="success-icon">&#10003;</div>
      <h1>Solicitação enviada</h1>
      <p class="success-msg">
        Sua solicitação de convite foi recebida com sucesso! Um administrador
        analisará seu pedido e você receberá um convite por e-mail.
      </p>
      <router-link :to="{ name: 'login' }" class="request-btn success-btn">Ir para o login</router-link>
    </div>

    <!-- Form state -->
    <div v-else class="request-card">
      <h1>Solicitar Convite</h1>
      <p class="request-subtitle">Reserva de Espaços — UFC</p>

      <form class="request-form" @submit.prevent="handleSubmit">
        <label class="request-field">
          <span>Nome completo</span>
          <input
            v-model="name"
            type="text"
            placeholder="Seu nome completo"
            autocomplete="name"
            required
            :disabled="loading"
          />
        </label>

        <label class="request-field">
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

        <div id="turnstile-container"></div>

        <p v-if="errorMsg" class="request-error">{{ errorMsg }}</p>

        <button type="submit" class="request-btn" :disabled="loading || !turnstileToken">
          {{ loading ? 'Enviando...' : 'Solicitar convite' }}
        </button>
      </form>

      <router-link :to="{ name: 'login' }" class="request-link">Já tem conta? Faça login</router-link>
    </div>
  </div>
</template>

<style scoped>
.request-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f7f7f7;
}

@supports (min-height: 100dvh) {
  .request-view {
    min-height: 100dvh;
  }
}

.request-view input,
.request-view .request-btn {
  min-height: var(--tap-min, 44px);
}

.request-card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.request-card h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  color: #1D9E75;
}

.request-subtitle {
  margin: 0 0 1.75rem;
  color: #888;
  font-size: 0.9rem;
}

.request-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  text-align: left;
}

.request-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.875rem;
  color: #555;
  font-weight: 500;
}

.request-field input {
  padding: 0.65rem 0.875rem;
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}

.request-field input:focus {
  border-color: #1D9E75;
}

.request-field input:disabled {
  background: #f5f5f5;
  color: #aaa;
}

#turnstile-container {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  min-height: 65px;
}

.request-btn {
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
  text-decoration: none;
  display: block;
  text-align: center;
}

.request-btn:hover:not(:disabled) {
  background: #178a64;
}

.request-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.request-error {
  color: #c0392b;
  font-size: 0.875rem;
  margin: 0;
}

.request-link {
  display: block;
  margin-top: 1rem;
  color: #888;
  font-size: 0.85rem;
  text-align: center;
  min-height: var(--tap-min, 44px);
  line-height: var(--tap-min, 44px);
  text-decoration: underline;
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.success-icon {
  font-size: 3rem;
  color: #1D9E75;
  line-height: 1;
}

.success-msg {
  color: #555;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.success-btn {
  margin-top: 0.5rem;
  width: 100%;
}
</style>
