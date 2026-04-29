<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api, ApiError } from '@/services/api';
import { mapAcceptError } from '@/utils/api-errors';
import type { UserRole } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const token = route.params.token as string;

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudante',
  professor: 'Professor(a)',
  staff: 'Funcionário(a)',
  maintenance: 'Manutenção',
};

type State = 'loading' | 'invalid' | 'ready' | 'submitting';

const state = ref<State>('loading');
const inviterName = ref('');
const roleLabel = ref('');

const password = ref('');
const passwordConfirm = ref('');
const fieldErrors = ref<Record<string, string>>({});
const submitError = ref<string | null>(null);

onMounted(async () => {
  try {
    const preview = await api.previewInvitation(token);
    if (!preview.valid) {
      state.value = 'invalid';
      return;
    }
    inviterName.value = preview.inviterName ?? '';
    roleLabel.value = ROLE_LABELS[preview.role ?? ''] ?? preview.role ?? '';
    state.value = 'ready';
  } catch {
    state.value = 'invalid';
  }
});

function validatePassword(): boolean {
  fieldErrors.value = {};
  const val = password.value;
  if (val.length < 10) {
    fieldErrors.value.password = 'A senha deve ter ao menos 10 caracteres.';
    return false;
  }
  if (!/[a-zA-Z]/.test(val) || !/[0-9]/.test(val)) {
    fieldErrors.value.password = 'A senha deve conter ao menos uma letra e um número.';
    return false;
  }
  if (password.value !== passwordConfirm.value) {
    fieldErrors.value.passwordConfirm = 'As senhas não coincidem.';
    return false;
  }
  return true;
}

async function handleAccept() {
  if (!validatePassword()) return;

  state.value = 'submitting';
  submitError.value = null;
  fieldErrors.value = {};

  try {
    const { accessToken, refreshToken, user } = await api.acceptInvitation(token, password.value);
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
    state.value = 'ready';
    if (e instanceof ApiError && e.details?.length) {
      for (const d of e.details) {
        fieldErrors.value[d.field] = d.message;
      }
    } else {
      submitError.value = mapAcceptError(e);
    }
  }
}
</script>

<template>
  <div class="invite-view">
    <!-- Loading -->
    <div v-if="state === 'loading'" class="invite-card">
      <p class="state-msg">Verificando convite...</p>
    </div>

    <!-- Invalid -->
    <div v-else-if="state === 'invalid'" class="invite-card">
      <h1>Convite inválido</h1>
      <p class="state-msg">Este convite é inválido ou expirou.</p>
      <a href="#/login" class="link-btn">Ir para o login</a>
    </div>

    <!-- Ready / Submitting -->
    <div v-else class="invite-card">
      <h1>Bem-vindo(a) ao UFCIM</h1>
      <p class="invite-info">
        Você foi convidado(a) por <strong>{{ inviterName }}</strong> para acessar o UFCIM como
        <strong>{{ roleLabel }}</strong>.
      </p>
      <p class="invite-info">Defina uma senha para ativar sua conta.</p>

      <form class="invite-form" @submit.prevent="handleAccept">
        <label class="invite-field">
          <span>Senha</span>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••••"
            autocomplete="new-password"
            :disabled="state === 'submitting'"
            required
          />
          <span class="field-hint">≥10 caracteres, ao menos uma letra e um número</span>
          <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
        </label>

        <label class="invite-field">
          <span>Confirmar senha</span>
          <input
            v-model="passwordConfirm"
            type="password"
            placeholder="••••••••••"
            autocomplete="new-password"
            :disabled="state === 'submitting'"
            required
          />
          <span v-if="fieldErrors.passwordConfirm" class="field-error">{{ fieldErrors.passwordConfirm }}</span>
        </label>

        <p v-if="submitError" class="submit-error">{{ submitError }}</p>

        <button type="submit" class="submit-btn" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Ativando...' : 'Ativar conta' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.invite-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f7f7f7;
}

@supports (min-height: 100dvh) {
  .invite-view {
    min-height: 100dvh;
  }
}

.invite-view input,
.invite-view button {
  min-height: var(--tap-min, 44px);
}

.invite-card {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.invite-card h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: #1D9E75;
}
.invite-info {
  color: #555;
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}
.invite-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-top: 1.5rem;
  text-align: left;
}
.invite-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #555;
  font-weight: 500;
}
.invite-field input {
  padding: 0.65rem 0.875rem;
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}
.invite-field input:focus {
  border-color: #1D9E75;
}
.invite-field input:disabled {
  background: #f5f5f5;
  color: #aaa;
}
.field-hint {
  font-size: 0.78rem;
  color: #aaa;
  font-weight: 400;
}
.field-error {
  font-size: 0.8rem;
  color: #c0392b;
  font-weight: 400;
}
.submit-error {
  color: #c0392b;
  font-size: 0.875rem;
  margin: 0;
}
.submit-btn {
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
.submit-btn:hover:not(:disabled) {
  background: #178a64;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.state-msg {
  color: #888;
  font-size: 0.9rem;
}
.link-btn {
  display: inline-block;
  margin-top: 1rem;
  color: #1D9E75;
  font-size: 0.9rem;
  text-decoration: underline;
}
</style>
