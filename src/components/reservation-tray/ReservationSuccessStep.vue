<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { PURPOSE_OPTIONS } from '@/types/reservation';

interface ReservationSuccessSummary {
  spaceName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

const props = defineProps<{
  reservationId: string;
  summary: ReservationSuccessSummary;
  /** Whether returning to the maquete is reachable (on the viewer, or the space has a 3D pin). */
  canReturnToMap?: boolean;
}>();

const emit = defineEmits<{
  viewReservations: [reservationId: string];
  backToMap: [];
}>();

const formattedDate = computed(() => {
  const d = new Date(`${props.summary.date}T12:00:00`);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
});

const timeRange = computed(() => `${props.summary.startTime}–${props.summary.endTime}`);
const purposeLabel = computed(() => PURPOSE_OPTIONS.find((option) => option.value === props.summary.purpose)?.label ?? props.summary.purpose);
</script>

<template>
  <section class="reservation-success-step" aria-labelledby="reservation-success-title">
    <div class="reservation-success-step__head">
      <span class="reservation-success-step__mark" aria-hidden="true">✓</span>
      <div>
        <h3 id="reservation-success-title">Reserva confirmada</h3>
        <p>Sua reserva foi criada e já aparece em Minhas reservas.</p>
      </div>
    </div>

    <dl class="reservation-success-step__summary" aria-label="Resumo da reserva confirmada">
      <div class="reservation-success-step__row reservation-success-step__row--strong">
        <dt>Espaço</dt>
        <dd>{{ summary.spaceName }}</dd>
      </div>
      <div class="reservation-success-step__row">
        <dt>Data</dt>
        <dd>{{ formattedDate }}</dd>
      </div>
      <div class="reservation-success-step__row">
        <dt>Horário</dt>
        <dd>{{ timeRange }}</dd>
      </div>
      <div class="reservation-success-step__row">
        <dt>Finalidade</dt>
        <dd>{{ purposeLabel }}</dd>
      </div>
    </dl>

    <div class="reservation-success-step__actions" aria-label="Próximas ações">
      <Button type="button" class="reservation-success-step__button" @click="emit('viewReservations', reservationId)">
        Ver minhas reservas
      </Button>
      <Button v-if="canReturnToMap" type="button" variant="outline" class="reservation-success-step__button" @click="emit('backToMap')">
        Voltar para maquete
      </Button>
    </div>
  </section>
</template>

<style scoped>
.reservation-success-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reservation-success-step__head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.reservation-success-step__mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success, #16a34a) 14%, transparent);
  color: var(--success, #16a34a);
  font-size: 1rem;
  font-weight: 800;
}

.reservation-success-step__head h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
}

.reservation-success-step__head p {
  margin: 0.2rem 0 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}

.reservation-success-step__summary {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}

.reservation-success-step__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--border);
}

.reservation-success-step__row:last-child {
  border-bottom: 0;
}

.reservation-success-step__row--strong {
  background: var(--muted);
}

.reservation-success-step__row dt {
  color: var(--muted-foreground);
  font-size: 0.78rem;
  font-weight: 600;
}

.reservation-success-step__row dd {
  margin: 0;
  max-width: 65%;
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: right;
}

.reservation-success-step__id {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.74rem;
}

.reservation-success-step__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.reservation-success-step__button {
  min-width: 9rem;
}

@media (max-width: 480px) {
  .reservation-success-step__actions {
    flex-direction: column;
  }

  .reservation-success-step__button {
    width: 100%;
  }
}
</style>
