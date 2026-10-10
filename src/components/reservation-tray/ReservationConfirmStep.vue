<script setup lang="ts">
import { computed } from 'vue';
import StatefulActionButton, { type ActionStatus } from '@/components/StatefulActionButton.vue';
import { PURPOSE_OPTIONS } from '@/types/reservation';

interface ReservationScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

interface ReservationPurposeSelection {
  purpose: string;
  description: string;
}

const props = defineProps<{
  spaceName: string;
  schedule: ReservationScheduleSelection;
  purpose: ReservationPurposeSelection;
  status: ActionStatus;
  error?: string | null;
  /** Edit mode (MEL-023): the schedule before the change, shown for comparison. */
  previous?: ReservationScheduleSelection | null;
}>();

const isEditing = computed(() => !!props.previous);

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const previousLabel = computed(() => {
  const before = props.previous;
  if (!before) return null;
  const unchanged = before.date === props.schedule.date
    && before.startTime === props.schedule.startTime
    && before.endTime === props.schedule.endTime;
  return unchanged ? null : `${formatDate(before.date)}, ${before.startTime}–${before.endTime}`;
});

const emit = defineEmits<{
  confirm: [];
}>();

const formattedDate = computed(() => formatDate(props.schedule.date));

const timeRange = computed(() => `${props.schedule.startTime}–${props.schedule.endTime}`);
const purposeLabel = computed(() => PURPOSE_OPTIONS.find((option) => option.value === props.purpose.purpose)?.label ?? props.purpose.purpose);
const description = computed(() => props.purpose.description.trim());
</script>

<template>
  <section class="reservation-confirm-step" aria-labelledby="reservation-confirm-title">
    <div class="reservation-confirm-step__head">
      <h3 id="reservation-confirm-title">{{ isEditing ? 'Revisar alterações' : 'Confirmar reserva' }}</h3>
      <p>{{ isEditing ? 'Confira os novos dados antes de salvar.' : 'Revise os dados antes de enviar a solicitação.' }}</p>
    </div>

    <dl class="reservation-confirm-step__summary" aria-label="Resumo da reserva">
      <div class="reservation-confirm-step__row reservation-confirm-step__row--strong">
        <dt>Espaço</dt>
        <dd>{{ spaceName }}</dd>
      </div>
      <div class="reservation-confirm-step__row">
        <dt>Data</dt>
        <dd>{{ formattedDate }}</dd>
      </div>
      <div class="reservation-confirm-step__row">
        <dt>Horário</dt>
        <dd>{{ timeRange }}</dd>
      </div>
      <div v-if="previousLabel" class="reservation-confirm-step__row" data-testid="reservation-confirm-previous">
        <dt>Antes</dt>
        <dd>{{ previousLabel }}</dd>
      </div>
      <div v-if="purposeLabel" class="reservation-confirm-step__row">
        <dt>Finalidade</dt>
        <dd>{{ purposeLabel }}</dd>
      </div>
      <div v-if="description" class="reservation-confirm-step__row reservation-confirm-step__row--stacked">
        <dt>Descrição</dt>
        <dd>{{ description }}</dd>
      </div>
    </dl>

    <p v-if="error" class="reservation-confirm-step__error" role="alert" aria-live="polite">{{ error }}</p>

    <StatefulActionButton
      v-if="isEditing"
      :status="status"
      idle-label="Salvar alterações"
      submitting-label="Salvando alterações..."
      success-label="Alterações salvas"
      error-label="Tentar novamente"
      @click="emit('confirm')"
    />
    <StatefulActionButton
      v-else
      :status="status"
      idle-label="Confirmar reserva"
      submitting-label="Enviando reserva..."
      success-label="Reserva confirmada"
      error-label="Tentar novamente"
      @click="emit('confirm')"
    />
  </section>
</template>

<style scoped>
.reservation-confirm-step {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.reservation-confirm-step__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.reservation-confirm-step__head h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
}

.reservation-confirm-step__head p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}

.reservation-confirm-step__summary {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}

.reservation-confirm-step__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--border);
}

.reservation-confirm-step__row:last-child {
  border-bottom: 0;
}

.reservation-confirm-step__row--strong {
  background: var(--muted);
}

.reservation-confirm-step__row--stacked {
  flex-direction: column;
  gap: 0.25rem;
}

.reservation-confirm-step__row dt {
  color: var(--muted-foreground);
  font-size: 0.78rem;
  font-weight: 600;
}

.reservation-confirm-step__row dd {
  margin: 0;
  max-width: 65%;
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: right;
}

.reservation-confirm-step__row--stacked dd {
  max-width: none;
  color: var(--foreground);
  font-weight: 500;
  text-align: left;
}

.reservation-confirm-step__error {
  margin: 0;
  color: var(--destructive);
  font-size: 0.85rem;
}
</style>
