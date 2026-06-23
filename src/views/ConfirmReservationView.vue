<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api, ApiError } from '@/services/api';
import { TIME_SLOT_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

type ConfirmStatus = 'idle' | 'submitting' | 'success' | 'error';

const confirmStatus = ref<ConfirmStatus>('idle');
const errorMsg = ref<string | null>(null);
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  if (!reservationStore.isReady) {
    router.replace({ name: 'campus-select' });
  }
});

onBeforeUnmount(() => {
  if (redirectTimer) window.clearTimeout(redirectTimer);
});

const purposeLabel = (value: string) =>
  PURPOSE_OPTIONS.find((o) => o.value === value)?.label ?? value;

const periodLabel = computed(() => {
  const range = `${reservationStore.startTime}–${reservationStore.endTime}`;
  if (reservationStore.selectedSlot) {
    return `${range} (${TIME_SLOT_LABELS[reservationStore.selectedSlot]})`;
  }
  return range;
});

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const confirmButtonLabel = computed(() => {
  if (confirmStatus.value === 'submitting') return 'Enviando reserva...';
  if (confirmStatus.value === 'success') return 'Reserva feita com sucesso!';
  if (confirmStatus.value === 'error') return 'Tentar confirmar novamente';
  return 'Confirmar Reserva';
});

const isConfirmDisabled = computed(() =>
  confirmStatus.value === 'submitting' || confirmStatus.value === 'success'
);

async function handleConfirm() {
  if (!reservationStore.isReady || isConfirmDisabled.value) return;
  confirmStatus.value = 'submitting';
  errorMsg.value = null;
  try {
    await api.createReservation(auth.token, {
      spaceId: reservationStore.spaceId!,
      date: reservationStore.date!,
      startTime: reservationStore.startTime!,
      endTime: reservationStore.endTime!,
      purpose: reservationStore.purpose ?? undefined,
      description: reservationStore.description ?? undefined,
    });
    confirmStatus.value = 'success';
    redirectTimer = setTimeout(() => {
      reservationStore.reset();
      router.push({ name: 'my-reservations' });
    }, 900);
  } catch (e) {
    confirmStatus.value = 'error';
    if (e instanceof ApiError && e.message) {
      errorMsg.value = e.message;
    } else {
      errorMsg.value = 'Não foi possível confirmar a reserva. Tente novamente.';
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-[540px] px-4 py-6">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" class="text-primary px-0" @click="router.back()">← Voltar</Button>
      <h1 class="m-0 text-xl font-semibold">Confirmar Reserva</h1>
    </div>

    <Card class="mb-6 gap-0 overflow-hidden py-0">
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Espaço</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ reservationStore.spaceName }}</span>
      </div>
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Data</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ dateLabel(reservationStore.date!) }}</span>
      </div>
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Período</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ periodLabel }}</span>
      </div>
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Finalidade</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ purposeLabel(reservationStore.purpose!) }}</span>
      </div>
      <div v-if="reservationStore.description" class="flex items-center justify-between px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Descrição</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ reservationStore.description }}</span>
      </div>
    </Card>

    <p v-if="errorMsg" class="text-destructive mb-4 text-sm" role="alert" aria-live="polite">{{ errorMsg }}</p>

    <Button
      class="confirm-button h-11 w-full"
      :data-state="confirmStatus"
      :aria-disabled="isConfirmDisabled"
      :aria-busy="confirmStatus === 'submitting'"
      @click="handleConfirm"
    >
      <Transition name="confirm-button-label" mode="out-in">
        <span :key="confirmButtonLabel" class="confirm-button__label">
          {{ confirmButtonLabel }}
        </span>
      </Transition>
    </Button>
  </div>
</template>

<style scoped>
.confirm-button {
  --confirm-button-bg: var(--primary);
  --confirm-button-fg: var(--primary-foreground);
  --confirm-button-shadow: transparent;

  position: relative;
  overflow: hidden;
  background: var(--confirm-button-bg);
  color: var(--confirm-button-fg);
  box-shadow: 0 0 0 0 var(--confirm-button-shadow);
  transition:
    background-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.confirm-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--confirm-button-bg) 88%, black);
}

.confirm-button[aria-disabled='true'] {
  cursor: default;
  pointer-events: none;
}

.confirm-button[data-state='submitting'] {
  --confirm-button-bg: var(--info);
  --confirm-button-fg: white;
  --confirm-button-shadow: color-mix(in srgb, var(--info) 32%, transparent);

  box-shadow: 0 0 0 4px var(--confirm-button-shadow);
}

.confirm-button[data-state='success'] {
  --confirm-button-bg: var(--success);
  --confirm-button-fg: white;
  --confirm-button-shadow: color-mix(in srgb, var(--success) 34%, transparent);

  box-shadow: 0 0 0 5px var(--confirm-button-shadow);
  transform: translateY(-1px);
}

.confirm-button[data-state='error'] {
  --confirm-button-bg: var(--destructive);
  --confirm-button-fg: var(--destructive-foreground);
  --confirm-button-shadow: color-mix(in srgb, var(--destructive) 28%, transparent);

  animation: confirm-button-error-nudge 260ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 0 4px var(--confirm-button-shadow);
}

.confirm-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity, filter;
}

.confirm-button-label-enter-active {
  transition:
    opacity 190ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 190ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 190ms cubic-bezier(0.22, 1, 0.36, 1);
}

.confirm-button-label-leave-active {
  transition:
    opacity 120ms cubic-bezier(0.4, 0, 0.2, 1),
    filter 120ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-button-label-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(6px);
}

.confirm-button-label-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-6px);
}

@keyframes confirm-button-error-nudge {
  0%,
  100% {
    transform: translateX(0);
  }

  35% {
    transform: translateX(-3px);
  }

  70% {
    transform: translateX(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .confirm-button,
  .confirm-button__label,
  .confirm-button-label-enter-active,
  .confirm-button-label-leave-active {
    animation: none !important;
    transition: none !important;
  }
}
</style>
