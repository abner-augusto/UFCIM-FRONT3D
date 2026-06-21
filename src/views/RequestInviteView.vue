<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from '@/services/api';
import { mapRequestInviteError } from '@/utils/api-errors';
import { RouterLink } from 'vue-router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
  <div class="flex min-h-screen items-center justify-center bg-muted/40 p-4 supports-[min-height:100dvh]:min-h-dvh">
    <!-- Success state -->
    <Card v-if="submitted" class="flex w-full max-w-[380px] flex-col items-center gap-3 px-8 py-10 text-center">
      <div class="text-primary text-5xl leading-none">&#10003;</div>
      <h1 class="text-primary m-0 text-2xl font-semibold">Solicitação enviada</h1>
      <p class="text-muted-foreground m-0 text-sm leading-relaxed">
        Sua solicitação de convite foi recebida com sucesso! Um administrador
        analisará seu pedido e você receberá um convite por e-mail.
      </p>
      <Button as-child class="mt-2 h-11 w-full">
        <RouterLink :to="{ name: 'login' }">Ir para o login</RouterLink>
      </Button>
    </Card>

    <!-- Form state -->
    <Card v-else class="w-full max-w-[380px] px-8 py-10 text-center">
      <h1 class="text-primary mb-1 text-[1.75rem] font-bold">Solicitar Convite</h1>
      <p class="text-muted-foreground mb-7 text-sm">Reserva de Espaços — UFC</p>

      <form class="flex flex-col gap-3.5 text-left" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-1.5">
          <Label for="request-name">Nome completo</Label>
          <Input
            id="request-name"
            v-model="name"
            class="h-11"
            type="text"
            placeholder="Seu nome completo"
            autocomplete="name"
            required
            :disabled="loading"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="request-email">Email</Label>
          <Input
            id="request-email"
            v-model="email"
            class="h-11"
            type="email"
            placeholder="seu@email.com"
            autocomplete="email"
            required
            :disabled="loading"
          />
        </div>

        <div id="turnstile-container" class="mt-2 flex min-h-[65px] justify-center"></div>

        <p v-if="errorMsg" class="text-destructive m-0 text-sm" role="alert" aria-live="polite">{{ errorMsg }}</p>

        <Button type="submit" class="mt-1 h-11" :disabled="loading || !turnstileToken">
          {{ loading ? 'Enviando...' : 'Solicitar convite' }}
        </Button>
      </form>

      <Button as-child variant="link" class="text-muted-foreground mt-4 h-11">
        <RouterLink :to="{ name: 'login' }">Já tem conta? Faça login</RouterLink>
      </Button>
    </Card>
  </div>
</template>
