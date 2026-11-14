<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { acceptFieldErrors, mapAcceptError } from '@/utils/api-errors';
import { validateAcceptInvite } from '@/utils/form-validation';
import type { UserRole } from '@/stores/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
const role = ref('');
const roleLabel = ref('');

const registration = ref('');
const password = ref('');
const passwordConfirm = ref('');
const fieldErrors = ref<Record<string, string>>({});
const submitError = ref<string | null>(null);

const isStudent = computed(() => role.value === 'student');

onMounted(async () => {
  try {
    const preview = await api.previewInvitation(token);
    if (!preview.valid) {
      state.value = 'invalid';
      return;
    }
    inviterName.value = preview.inviterName ?? '';
    role.value = preview.role ?? '';
    roleLabel.value = ROLE_LABELS[preview.role ?? ''] ?? preview.role ?? '';
    state.value = 'ready';
  } catch {
    state.value = 'invalid';
  }
});

async function focusError() {
  await nextTick();
  const first = ['registration', 'password', 'passwordConfirm'].find((field) => fieldErrors.value[field]);
  if (first) document.getElementById(first === 'passwordConfirm' ? 'invite-password-confirm' : `invite-${first}`)?.focus();
}

async function handleAccept() {
  const invalid = validateAcceptInvite({
    student: isStudent.value,
    registration: registration.value,
    password: password.value,
    confirmation: passwordConfirm.value,
  });
  fieldErrors.value = {};
  if (invalid) {
    fieldErrors.value[invalid.field] = invalid.message;
    await focusError();
    return;
  }

  state.value = 'submitting';
  submitError.value = null;
  fieldErrors.value = {};

  try {
    const { accessToken, refreshToken, user } = await api.acceptInvitation(token, password.value, registration.value.trim() || undefined);
    auth.setAuth(accessToken, refreshToken, {
      id: user.id,
      name: user.name,
      email: user.email,
      registration: user.registration,
      role: user.role as UserRole,
      department: user.department,
      isMasterAdmin: user.isMasterAdmin,
    }, user.unreadCount ?? 0);
    router.push({ name: 'campus-select' });
  } catch (e) {
    state.value = 'ready';
    const errors = acceptFieldErrors(e);
    if (errors) {
      fieldErrors.value = errors;
      await focusError();
    } else {
      submitError.value = mapAcceptError(e);
    }
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/40 p-4 supports-[min-height:100dvh]:min-h-dvh">
    <!-- Loading -->
    <Card v-if="state === 'loading'" class="w-full max-w-[400px] px-8 py-10 text-center">
      <p class="text-muted-foreground text-sm">Verificando convite...</p>
    </Card>

    <!-- Invalid -->
    <Card v-else-if="state === 'invalid'" class="w-full max-w-[400px] px-8 py-10 text-center">
      <h1 class="text-primary mb-4 text-2xl font-semibold">Convite inválido</h1>
      <p class="text-muted-foreground text-sm">Este convite é inválido ou expirou.</p>
      <a href="#/login" class="text-primary mt-4 inline-block text-sm underline">Ir para o login</a>
    </Card>

    <!-- Ready / Submitting -->
    <Card v-else class="w-full max-w-[400px] px-8 py-10 text-center">
      <h1 class="text-primary mb-4 text-2xl font-semibold">Bem-vindo(a) ao UFCIM</h1>
      <p class="text-muted-foreground mb-2 text-sm">
        Você foi convidado(a) por <strong>{{ inviterName }}</strong> para acessar o UFCIM como
        <strong>{{ roleLabel }}</strong>.
      </p>
      <p class="text-muted-foreground mb-2 text-sm">Defina uma senha para ativar sua conta.</p>

      <form novalidate class="mt-6 flex flex-col gap-3.5 text-left" @submit.prevent="handleAccept">
        <div class="flex flex-col gap-1">
          <Label for="invite-registration">Matrícula{{ isStudent ? '' : ' (opcional)' }}</Label>
          <Input
            id="invite-registration"
            v-model="registration"
            class="h-11"
            type="text"
            inputmode="numeric"
            placeholder="Sua matrícula UFC"
            autocomplete="off"
            :disabled="state === 'submitting'"
            :required="isStudent"
            :aria-invalid="!!fieldErrors.registration"
            :aria-describedby="fieldErrors.registration ? 'err-registration' : undefined"
          />
          <span v-if="fieldErrors.registration" id="err-registration" class="text-destructive text-[0.8rem]">{{ fieldErrors.registration }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <Label for="invite-password">Senha</Label>
          <Input
            id="invite-password"
            v-model="password"
            class="h-11"
            type="password"
            placeholder="••••••••••"
            autocomplete="new-password"
            :disabled="state === 'submitting'"
            required
            :aria-invalid="!!fieldErrors.password"
            :aria-describedby="`invite-password-hint${fieldErrors.password ? ' err-password' : ''}`"
          />
          <span id="invite-password-hint" class="text-muted-foreground text-[0.78rem]">≥8 caracteres, ao menos uma letra e um número</span>
          <span v-if="fieldErrors.password" id="err-password" class="text-destructive text-[0.8rem]">{{ fieldErrors.password }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <Label for="invite-password-confirm">Confirmar senha</Label>
          <Input
            id="invite-password-confirm"
            v-model="passwordConfirm"
            class="h-11"
            type="password"
            placeholder="••••••••••"
            autocomplete="new-password"
            :disabled="state === 'submitting'"
            required
            :aria-invalid="!!fieldErrors.passwordConfirm"
            :aria-describedby="fieldErrors.passwordConfirm ? 'err-password-confirm' : undefined"
          />
          <span v-if="fieldErrors.passwordConfirm" id="err-password-confirm" class="text-destructive text-[0.8rem]">{{ fieldErrors.passwordConfirm }}</span>
        </div>

        <p v-if="submitError" class="text-destructive m-0 text-sm" role="alert">{{ submitError }}</p>

        <Button type="submit" class="mt-1 h-11" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Ativando...' : 'Ativar conta' }}
        </Button>
      </form>
    </Card>
  </div>
</template>
