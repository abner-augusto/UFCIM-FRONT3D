<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter, RouterLink } from 'vue-router';
import { api } from '@/services/api';
import { mapLoginError } from '@/utils/api-errors';
import type { UserRole } from '@/stores/auth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import UfcimLogo from '@/components/UfcimLogo.vue';

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
  <div class="flex min-h-screen items-center justify-center bg-muted/40 supports-[min-height:100dvh]:min-h-dvh">
    <Card class="w-full max-w-[380px] px-8 py-10 text-center">
      <h1 class="mb-2 flex justify-center">
        <UfcimLogo label="UFCIM" class="text-foreground h-16 w-auto" />
      </h1>
      <p class="text-muted-foreground mb-7 text-sm">Reserva de Espaços — UFC</p>

      <form class="flex flex-col gap-3.5 text-left" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-1.5">
          <Label for="login-email">Email</Label>
          <Input
            id="login-email"
            v-model="email"
            class="h-11"
            type="email"
            placeholder="seu@email.com"
            autocomplete="email"
            required
            :disabled="loading"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="login-password">Senha</Label>
          <Input
            id="login-password"
            v-model="password"
            class="h-11"
            type="password"
            placeholder="••••••••••"
            autocomplete="current-password"
            required
            :disabled="loading"
          />
        </div>

        <p v-if="errorMsg" class="text-destructive m-0 text-sm" role="alert" aria-live="polite">{{ errorMsg }}</p>

        <Button type="submit" class="mt-1 h-11" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </Button>
      </form>

      <Button
        variant="link"
        class="text-muted-foreground mt-4 h-11"
        @click="showForgotInfo = !showForgotInfo"
      >
        Esqueci minha senha
      </Button>
      <p v-if="showForgotInfo" class="bg-muted text-muted-foreground mt-2 rounded-lg px-3.5 py-2.5 text-left text-sm">
        Entre em contato com o administrador para redefinir sua senha.
      </p>

      <div class="mt-6 border-t pt-5">
        <p class="text-muted-foreground mb-2.5 text-sm">Ainda não tem conta?</p>
        <Button as-child variant="outline" class="h-11 w-full">
          <RouterLink :to="{ name: 'request-invite' }">Solicitar convite</RouterLink>
        </Button>
      </div>
    </Card>
  </div>
</template>
