<script setup lang="ts">
import { computed } from 'vue';
import { PURPOSE_OPTIONS, STATUS_LABELS, type Reservation } from '@/types/reservation';
import { SPACE_TYPE_LABELS } from '@/types/space';
import StatusBadge, { type StatusBadgeVariant } from '@/components/StatusBadge.vue';
import { formatDateLong, formatDateShort, formatDateTime } from '@/utils/date';
import { isReservationPast, reservationDescription } from '@/utils/my-reservations';
import { blockValue, departmentLabel } from '@/utils/space-labels';
import { formatReservationPeriod, reservationActors } from '@/utils/unit-reservations';

const props = defineProps<{
  reservation: Reservation;
  expanded: boolean;
  highlighted?: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const PURPOSE_LABELS = Object.fromEntries(PURPOSE_OPTIONS.map((o) => [o.value, o.label]));

const STATUS_VARIANT: Record<Reservation['status'] | 'completed', StatusBadgeVariant> = {
  confirmed: 'success',
  canceled: 'danger',
  modified: 'warning',
  overridden: 'violet',
  completed: 'muted',
};

const actors = computed(() => reservationActors(props.reservation));
const description = computed(() => reservationDescription(props.reservation));
const spaceName = computed(
  () => props.reservation.space?.name ?? props.reservation.space?.number ?? props.reservation.spaceId,
);
const completed = computed(
  () => props.reservation.status === 'confirmed' && isReservationPast(props.reservation, new Date()),
);
</script>

<template>
  <li
    class="unit-card"
    :class="{ 'unit-card--expanded': expanded, 'unit-card--highlighted': highlighted }"
    data-testid="unit-reservation-card"
  >
    <button class="unit-card__summary press-feedback" :aria-expanded="expanded" @click="emit('toggle')">
      <div class="unit-card__info">
        <h3>{{ spaceName }}</h3>
        <p v-if="description" class="unit-card__description">{{ description }}</p>
        <p class="unit-card__actor" data-testid="unit-reservation-registered-by">
          Registrada por: {{ actors.registeredBy }}
        </p>
        <p class="unit-card__actor" data-testid="unit-reservation-requester">
          Solicitante: {{ actors.requester }}
        </p>
        <p>{{ formatDateLong(reservation.date) }}</p>
        <p>{{ formatReservationPeriod(reservation.startTime, reservation.endTime) }}</p>
      </div>
      <div class="unit-card__right">
        <StatusBadge v-if="completed" :variant="STATUS_VARIANT.completed">Concluída</StatusBadge>
        <StatusBadge v-else :variant="STATUS_VARIANT[reservation.status]">
          {{ STATUS_LABELS[reservation.status] }}
        </StatusBadge>
        <StatusBadge v-if="reservation.recurrenceId" variant="info">Série</StatusBadge>
        <span class="expand-chevron" :class="{ rotated: expanded }">›</span>
      </div>
    </button>

    <div class="reveal-collapse" :class="{ 'reveal-collapse--open': expanded }">
      <div class="reveal-collapse__inner" :inert="!expanded">
        <div class="unit-detail">
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="reservation.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ reservation.space.name }}</span>
              </div>
              <div v-if="reservation.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ reservation.space.number }}</span>
              </div>
              <div v-if="reservation.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ blockValue(reservation.space.block) }}</span>
              </div>
              <div v-if="reservation.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ reservation.space.campus }}</span>
              </div>
              <div v-if="reservation.space?.type" class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ SPACE_TYPE_LABELS[reservation.space.type] ?? reservation.space.type }}</span>
              </div>
              <div v-if="reservation.space?.capacity != null" class="detail-item">
                <span class="detail-label">Capacidade</span>
                <span class="detail-value">{{ reservation.space.capacity }} pessoas</span>
              </div>
              <div v-if="reservation.space?.department" class="detail-item">
                <span class="detail-label">Departamento</span>
                <span class="detail-value">{{ departmentLabel(reservation.space.department) }}</span>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <p class="detail-section__title">Reserva</p>
            <div class="detail-grid">
              <div v-if="description" class="detail-item detail-item--stacked">
                <span class="detail-label">Descrição</span>
                <span class="detail-value detail-value--prose">{{ description }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ formatDateShort(reservation.date, { weekday: true }) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ reservation.startTime }}–{{ reservation.endTime }}</span>
              </div>
              <div v-if="reservation.purpose" class="detail-item">
                <span class="detail-label">Finalidade</span>
                <span class="detail-value">{{ PURPOSE_LABELS[reservation.purpose] ?? reservation.purpose }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Registrada por</span>
                <span class="detail-value">{{ actors.registeredBy }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Solicitante</span>
                <span class="detail-value">{{ actors.requester }}</span>
              </div>
              <div v-if="reservation.requesterContact" class="detail-item">
                <span class="detail-label">Contato</span>
                <span class="detail-value">{{ reservation.requesterContact }}</span>
              </div>
              <div v-if="reservation.recurrenceId" class="detail-item">
                <span class="detail-label">Recorrência ID</span>
                <span class="detail-value detail-value--mono">{{ reservation.recurrenceId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criada em</span>
                <span class="detail-value">{{ formatDateTime(reservation.createdAt) }}</span>
              </div>
              <div v-if="reservation.updatedAt !== reservation.createdAt" class="detail-item">
                <span class="detail-label">Atualizada em</span>
                <span class="detail-value">{{ formatDateTime(reservation.updatedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ reservation.id }}</span>
              </div>
            </div>
          </section>

          <div v-if="reservation.status === 'canceled' && reservation.cancelReason" class="detail-cancel-reason">
            <p class="detail-cancel-reason__label">Motivo do cancelamento</p>
            <p class="detail-cancel-reason__text">{{ reservation.cancelReason }}</p>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped>
.unit-card { border: 1px solid var(--border); border-radius: 12px; background: var(--card); overflow: hidden; }
.unit-card--expanded { border-color: var(--primary); }
.unit-card--highlighted {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, var(--card));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
}
.unit-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 0.75rem;
}
.unit-card__summary:hover { background: var(--accent); }
.unit-card__info { min-width: 0; }
.unit-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unit-card__info p { margin: 0; color: var(--muted-foreground); font-size: 0.85rem; line-height: 1.5; }
.unit-card__info p.unit-card__description {
  margin: 0 0 0.2rem;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.unit-card__info p.unit-card__actor { color: var(--foreground); font-weight: 500; overflow-wrap: anywhere; }
.unit-card__right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
.expand-chevron { font-size: 1.1rem; color: var(--muted-foreground); line-height: 1; transform: rotate(90deg); transition: transform 0.2s ease; display: inline-block; }
.expand-chevron.rotated { transform: rotate(-90deg); }
.unit-detail { border-top: 1px solid var(--border); padding: 1rem 1.25rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.detail-section__title { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin: 0 0 0.6rem; }
.detail-grid { display: flex; flex-direction: column; gap: 0.35rem; }
.detail-item { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.84rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; gap: 0.5rem; }
.detail-item:last-child { border-bottom: none; padding-bottom: 0; }
@media (max-width: 480px) { .detail-item { flex-direction: column; align-items: flex-start; gap: 0.15rem; } }
.detail-label { color: var(--muted-foreground); flex-shrink: 0; }
.detail-value { font-weight: 500; color: var(--foreground); text-align: right; word-break: break-all; }
@media (max-width: 480px) { .detail-value { text-align: left; word-break: break-word; } }
.detail-item--stacked { flex-direction: column; align-items: flex-start; gap: 0.15rem; }
.detail-value--prose { text-align: left; font-weight: 400; line-height: 1.5; overflow-wrap: anywhere; word-break: normal; }
.detail-value--mono { font-family: monospace; font-size: 0.75rem; color: var(--muted-foreground); }
.detail-cancel-reason { padding: 0.65rem 0.9rem; border-radius: 10px; background: var(--danger-surface); border: 1px solid var(--danger-border); }
.detail-cancel-reason__label { margin: 0 0 0.2rem; color: var(--danger-fg); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.detail-cancel-reason__text { margin: 0; color: var(--danger-fg); font-size: 0.84rem; }
</style>
