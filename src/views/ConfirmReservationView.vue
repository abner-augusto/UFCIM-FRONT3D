<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api, ApiError } from '@/services/api';
import { TIME_SLOT_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatefulActionButton, { type ActionStatus } from '@/components/StatefulActionButton.vue';

const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

const confirmStatus = ref<ActionStatus>('idle');
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

async function handleConfirm() {
  if (!reservationStore.isReady || confirmStatus.value === 'submitting' || confirmStatus.value === 'success') return;
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

    <StatefulActionButton
      :status="confirmStatus"
      idle-label="Confirmar Reserva"
      submitting-label="Enviando reserva..."
      success-label="Reserva feita com sucesso!"
      error-label="Tentar confirmar novamente"
      @click="handleConfirm"
    />
  </div>
</template>
