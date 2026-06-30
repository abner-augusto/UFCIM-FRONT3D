<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Reservation } from '@/types/reservation';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, STATUS_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';
import { SPACE_TYPE_LABELS } from '@/types/space';
import type { TimeSlot } from '@/types/reservation';
import { Button } from '@/components/ui/button';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';
import CancelReservationDialog, {
  type CancelReservationStatus,
  type CancelReservationSummary,
} from '@/components/CancelReservationDialog.vue';

const route = useRoute();
const auth = useAuthStore();

const reservations = ref<Reservation[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const cancelling = ref<string | null>(null);
const cancellingSeries = ref<string | null>(null);
const expandedId = ref<string | null>(null);
const activeHighlightId = ref<string | null>(null);
const cancelDialogOpen = ref(false);
const cancelTarget = ref<CancelTarget | null>(null);
const cancelStatus = ref<CancelReservationStatus>('idle');
const cancelErrorMessage = ref<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;
let cancelSuccessTimer: ReturnType<typeof setTimeout> | null = null;
// Bumped on every cancel-target change so a slow series-impact response can't
// overwrite the count for a target the user has since switched away from.
let impactRequestSeq = 0;

interface CancelTarget {
  kind: 'single' | 'series';
  id: string;
  summary: CancelReservationSummary;
  futureOccurrencesCount?: number;
}

const PURPOSE_LABELS = Object.fromEntries(PURPOSE_OPTIONS.map(o => [o.value, o.label]));

onMounted(async () => {
  await loadReservations();
  armHighlightFromQuery();
});

onBeforeUnmount(() => {
  clearHighlightTimer();
  clearCancelSuccessTimer();
});

watch(() => route.query.highlight, () => {
  armHighlightFromQuery();
});

async function loadReservations() {
  loading.value = true;
  errorMsg.value = null;
  try {
    reservations.value = await api.getMyReservations(auth.token);
  } catch {
    errorMsg.value = 'Não foi possível carregar suas reservas.';
  } finally {
    loading.value = false;
  }
}

function reservationSpaceName(reservation: Reservation): string {
  return reservation.space?.name ?? reservation.space?.number ?? reservation.spaceId;
}

function reservationSummary(reservation: Reservation, date = dateShort(reservation.date)): CancelReservationSummary {
  return {
    spaceName: reservationSpaceName(reservation),
    dateLabel: date,
    timeLabel: `${reservation.startTime}–${reservation.endTime}`,
  };
}

function futureConfirmedOccurrences(items: Reservation[]): Reservation[] {
  return items.filter(r => r.status === 'confirmed' && !isCompleted(r));
}

function openCancelDialog(reservation: Reservation) {
  impactRequestSeq += 1;
  resetCancelState();
  cancelTarget.value = {
    kind: 'single',
    id: reservation.id,
    summary: reservationSummary(reservation),
  };
  cancelDialogOpen.value = true;
}

function openCancelSeriesDialog(group: GroupedReservation) {
  const requestSeq = (impactRequestSeq += 1);
  const futureOccurrences = futureConfirmedOccurrences(group.items);
  const firstFuture = futureOccurrences[0] ?? group.main;
  resetCancelState();
  cancelTarget.value = {
    kind: 'series',
    id: group.id,
    summary: reservationSummary(firstFuture, `A partir de ${dateShort(firstFuture.date)}`),
    // Client estimate shown instantly; refined below with the backend's count.
    futureOccurrencesCount: futureOccurrences.length,
  };
  cancelDialogOpen.value = true;
  void refreshSeriesImpact(group.id, requestSeq);
}

// Fetch the backend's accurate future-occurrence count and apply it, unless a
// newer cancel target has been opened in the meantime (stale-response guard).
async function refreshSeriesImpact(recurrenceId: string, requestSeq: number) {
  try {
    const impact = await api.getSeriesImpact(auth.token, recurrenceId);
    const target = cancelTarget.value;
    if (requestSeq !== impactRequestSeq || !target || target.kind !== 'series' || target.id !== recurrenceId) {
      return;
    }
    cancelTarget.value = { ...target, futureOccurrencesCount: impact.futureCount };
  } catch {
    // Silently keep the client estimate; never block or surface an error.
  }
}

function closeCancelDialog() {
  if (cancelStatus.value === 'submitting' || cancelStatus.value === 'success') return;
  cancelDialogOpen.value = false;
  cancelTarget.value = null;
  resetCancelState();
}

function handleCancelDialogOpenChange(open: boolean) {
  if (open) {
    cancelDialogOpen.value = true;
    return;
  }
  closeCancelDialog();
}

async function confirmCancellation() {
  const target = cancelTarget.value;
  if (!target || cancelStatus.value === 'submitting' || cancelStatus.value === 'success') return;

  cancelStatus.value = 'submitting';
  cancelErrorMessage.value = null;

  try {
    if (target.kind === 'series') {
      await handleCancelSeries(target.id);
    } else {
      await handleCancel(target.id);
    }
    cancelStatus.value = 'success';
    cancelSuccessTimer = setTimeout(() => {
      cancelDialogOpen.value = false;
      cancelTarget.value = null;
      resetCancelState();
      void loadReservations();
    }, 700);
  } catch {
    cancelStatus.value = 'error';
    cancelErrorMessage.value = target.kind === 'series'
      ? 'Não foi possível cancelar a série de reservas. Verifique sua conexão e tente novamente.'
      : 'Não foi possível cancelar a reserva. Verifique sua conexão e tente novamente.';
  }
}

async function handleCancel(id: string) {
  cancelling.value = id;
  try {
    await api.cancelReservation(auth.token, id);
  } finally {
    cancelling.value = null;
  }
}

async function handleCancelSeries(recurrenceId: string) {
  cancellingSeries.value = recurrenceId;
  try {
    await api.cancelReservationSeries(auth.token, recurrenceId);
  } finally {
    cancellingSeries.value = null;
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function clearHighlightTimer() {
  if (!highlightTimer) return;
  clearTimeout(highlightTimer);
  highlightTimer = null;
}

function clearCancelSuccessTimer() {
  if (!cancelSuccessTimer) return;
  clearTimeout(cancelSuccessTimer);
  cancelSuccessTimer = null;
}

function resetCancelState() {
  clearCancelSuccessTimer();
  cancelStatus.value = 'idle';
  cancelErrorMessage.value = null;
}

function getHighlightQuery(): string | null {
  const value = route.query.highlight;
  return typeof value === 'string' && value.trim() ? value : null;
}

function armHighlightFromQuery() {
  const reservationId = getHighlightQuery();
  clearHighlightTimer();

  if (!reservationId || !hasHighlightedReservation(reservationId)) {
    activeHighlightId.value = null;
    return;
  }

  activeHighlightId.value = reservationId;
  highlightTimer = setTimeout(() => {
    activeHighlightId.value = null;
    highlightTimer = null;
  }, 2500);
}

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const dateShort = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const datetimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function periodLabel(startTime: string, endTime: string): string {
  const namedSlot = (Object.entries(TIME_SLOT_RANGES) as [TimeSlot, { startTime: string; endTime: string }][])
    .find(([, r]) => r.startTime === startTime && r.endTime === endTime);
  const range = `${startTime}–${endTime}`;
  return namedSlot ? `${range} (${TIME_SLOT_LABELS[namedSlot[0]]})` : range;
}

function isCompleted(r: Reservation): boolean {
  const normalizedEnd = r.endTime === '24:00' ? '23:59' : r.endTime;
  return new Date(`${r.date}T${normalizedEnd}:00`) < new Date();
}

function hasFutureOccurrences(items: Reservation[]): boolean {
  return futureConfirmedOccurrences(items).length > 0;
}

interface GroupedReservation {
  id: string; // recurrenceId if recurrent, else reservation id
  isRecurrent: boolean;
  recurrenceId: string | null;
  items: Reservation[];
  main: Reservation;
}

const groupedReservations = computed<GroupedReservation[]>(() => {
  const groups: { [key: string]: { isRecurrent: boolean; items: Reservation[] } } = {};
  
  for (const r of reservations.value) {
    const key = r.recurrenceId || r.id;
    if (!groups[key]) {
      groups[key] = { isRecurrent: !!r.recurrenceId, items: [] };
    }
    groups[key].items.push(r);
  }
  
  const result: GroupedReservation[] = [];
  const now = new Date();
  
  for (const [key, group] of Object.entries(groups)) {
    group.items.sort((a, b) => a.date.localeCompare(b.date));
    
    // For main, pick the first active future reservation, or the last one if none are active
    let main = group.items.find(r => {
      const normalizedEnd = r.endTime === '24:00' ? '23:59' : r.endTime;
      return new Date(`${r.date}T${normalizedEnd}:00`) >= now && r.status === 'confirmed';
    });
    if (!main) main = group.items[group.items.length - 1];

    result.push({
      id: key,
      isRecurrent: group.isRecurrent,
      recurrenceId: group.isRecurrent ? key : null,
      items: group.items,
      main
    });
  }
  
  // Sort overall by main date descending
  result.sort((a, b) => b.main.date.localeCompare(a.main.date));
  
  return result;
});

function hasHighlightedReservation(reservationId: string): boolean {
  return groupedReservations.value.some(group => isGroupMatchingHighlight(group, reservationId));
}

function isGroupHighlighted(group: GroupedReservation): boolean {
  return !!activeHighlightId.value && isGroupMatchingHighlight(group, activeHighlightId.value);
}

function isGroupMatchingHighlight(group: GroupedReservation, reservationId: string): boolean {
  return group.id === reservationId || group.items.some(r => r.id === reservationId);
}
</script>

<template>
  <div class="my-reservations-view">
    <h1>Minhas Reservas</h1>

    <ListItemSkeleton v-if="loading" :count="4" label="Carregando reservas" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="groupedReservations.length === 0" class="state-empty">
      <p>Você ainda não tem nenhuma reserva.</p>
    </div>

    <TransitionGroup v-else tag="ul" name="rlist" class="reservation-list">
      <li
        v-for="(group, i) in groupedReservations"
        :key="group.id"
        class="reservation-card stagger-item"
        :style="{ '--i': i }"
        :class="{
          'reservation-card--expanded': expandedId === group.id,
          'reservation-card--highlighted': isGroupHighlighted(group),
        }"
      >
        <!-- Summary row — always visible -->
        <button class="reservation-card__summary press-feedback" :aria-expanded="expandedId === group.id" @click="toggleExpand(group.id)">
          <div class="reservation-card__info">
            <h3>{{ group.main.space?.name ?? group.main.space?.number ?? group.main.spaceId }}</h3>
            <p v-if="!group.isRecurrent">{{ dateLabel(group.main.date) }}</p>
            <p v-else>Recorrente: {{ group.items.length }} ocorrências</p>
            <p>{{ periodLabel(group.main.startTime, group.main.endTime) }}</p>
          </div>
          <div class="reservation-card__right">
            <template v-if="!group.isRecurrent">
              <span v-if="isCompleted(group.main) && group.main.status === 'confirmed'" class="status-badge status-badge--completed">
                Concluída
              </span>
              <span v-else class="status-badge" :class="`status-badge--${group.main.status}`">
                {{ STATUS_LABELS[group.main.status] }}
              </span>
            </template>
            <template v-else>
               <span class="status-badge status-badge--recurrent">Série</span>
            </template>
            <span class="expand-chevron" :class="{ rotated: expandedId === group.id }">›</span>
          </div>
        </button>

        <!-- Detail panel — same-object reveal (shared .reveal-collapse utility) -->
        <div class="reveal-collapse" :class="{ 'reveal-collapse--open': expandedId === group.id }">
          <div class="reveal-collapse__inner" :inert="expandedId !== group.id">
            <div class="reservation-detail">
          <!-- Space info -->
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="group.main.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ group.main.space.name }}</span>
              </div>
              <div v-if="group.main.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ group.main.space.number }}</span>
              </div>
              <div v-if="group.main.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ group.main.space.block }}</span>
              </div>
              <div v-if="group.main.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ group.main.space.campus }}</span>
              </div>
              <div v-if="group.main.space?.type" class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ SPACE_TYPE_LABELS[group.main.space.type] ?? group.main.space.type }}</span>
              </div>
              <div v-if="group.main.space?.capacity != null" class="detail-item">
                <span class="detail-label">Capacidade</span>
                <span class="detail-value">{{ group.main.space.capacity }} pessoas</span>
              </div>
              <div v-if="group.main.space?.department" class="detail-item">
                <span class="detail-label">Departamento</span>
                <span class="detail-value">{{ group.main.space.department }}</span>
              </div>
            </div>
          </section>

          <!-- Reservation info for single or group -->
          <section class="detail-section">
            <p class="detail-section__title">{{ group.isRecurrent ? 'Série de Reservas' : 'Reserva' }}</p>
            <div class="detail-grid">
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ dateShort(group.main.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ group.main.startTime }}–{{ group.main.endTime }}</span>
              </div>
              <div v-if="group.main.purpose" class="detail-item">
                <span class="detail-label">Finalidade</span>
                <span class="detail-value">{{ PURPOSE_LABELS[group.main.purpose] ?? group.main.purpose }}</span>
              </div>
              <div v-if="group.isRecurrent" class="detail-item">
                <span class="detail-label">Recorrência ID</span>
                <span class="detail-value detail-value--mono">{{ group.id }}</span>
              </div>
              <div v-if="group.main.changeOrigin" class="detail-item">
                <span class="detail-label">Origem da alteração</span>
                <span class="detail-value">{{ group.main.changeOrigin }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.createdAt) }}</span>
              </div>
              <div v-if="group.main.updatedAt !== group.main.createdAt" class="detail-item">
                <span class="detail-label">Atualizada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.updatedAt) }}</span>
              </div>
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ group.main.id }}</span>
              </div>
            </div>
          </section>

          <!-- Occurrences for recurrent -->
          <div v-if="group.isRecurrent" class="recurrence-list">
            <p class="detail-section__title" style="margin-top: 1rem">Ocorrências</p>
            <div v-for="r in group.items" :key="r.id" class="recurrence-item">
              <span class="recurrence-date">{{ dateShort(r.date) }}</span>
              <div class="recurrence-actions">
                <span v-if="isCompleted(r) && r.status === 'confirmed'" class="status-badge status-badge--completed">
                  Concluída
                </span>
                <span v-else class="status-badge" :class="`status-badge--${r.status}`">
                  {{ STATUS_LABELS[r.status] }}
                </span>
                <Button v-if="r.status === 'confirmed' && !isCompleted(r)" variant="link" class="text-destructive h-auto p-0 text-xs" @click="openCancelDialog(r)" :disabled="cancelling === r.id || cancellingSeries === group.id">
                  {{ cancelling === r.id ? '...' : 'Cancelar' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Cancellation reason for single -->
          <div v-if="!group.isRecurrent && group.main.status === 'canceled' && group.main.cancelReason" class="detail-cancel-reason">
            <p class="detail-cancel-reason__label">Motivo do cancelamento</p>
            <p class="detail-cancel-reason__text">{{ group.main.cancelReason }}</p>
          </div>

          <!-- Actions -->
          <div class="detail-actions" style="margin-top: 1rem">
            <Button
              v-if="!group.isRecurrent && group.main.status === 'confirmed' && !isCompleted(group.main)"
              variant="outline"
              class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="cancelling === group.main.id"
              @click="openCancelDialog(group.main)"
            >
              {{ cancelling === group.main.id ? 'Cancelando...' : 'Cancelar reserva' }}
            </Button>

            <Button
              v-if="group.isRecurrent && hasFutureOccurrences(group.items)"
              variant="outline"
              class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
              :disabled="cancellingSeries === group.id"
              @click="openCancelSeriesDialog(group)"
            >
              {{ cancellingSeries === group.id ? 'Cancelando...' : 'Cancelar todas as datas futuras' }}
            </Button>
          </div>

            </div>
          </div>
        </div>
      </li>
    </TransitionGroup>

    <CancelReservationDialog
      :open="cancelDialogOpen"
      :summary="cancelTarget?.summary ?? null"
      :future-occurrences-count="cancelTarget?.futureOccurrencesCount ?? null"
      :status="cancelStatus"
      :error-message="cancelErrorMessage"
      @update:open="handleCancelDialogOpenChange"
      @confirm="confirmCancellation"
      @keep="closeCancelDialog"
    />
  </div>
</template>

<style scoped>
.my-reservations-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
h1 {
  margin: 0 0 1.5rem;
  font-size: 1.3rem;
}
.reservation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative; /* anchor for a leaving card's absolute position (FLIP) */
}

/* FLIP: when a card expands or one is removed, the others glide to their new
   spot instead of snapping. Entrance is handled by `.stagger-item`. */
.rlist-move {
  transition: transform 300ms var(--ease-out-quart, ease);
}
.rlist-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
  position: absolute;
  left: 0;
  right: 0;
}
.rlist-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Card */
.reservation-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  overflow: hidden;
  transition: border-color 0.15s, background-color var(--duration-med, 220ms) ease, box-shadow var(--duration-med, 220ms) ease;
}
.reservation-card--expanded {
  border-color: var(--primary);
}
.reservation-card--highlighted {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 9%, var(--card));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}

/* Summary row */
.reservation-card__summary {
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
.reservation-card__summary:hover {
  background: var(--accent);
}

.reservation-card__info {
  min-width: 0;
}
.reservation-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reservation-card__info p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.85rem;
  line-height: 1.5;
}
.reservation-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* Chevron */
.expand-chevron {
  font-size: 1.1rem;
  color: var(--muted-foreground);
  line-height: 1;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
  display: inline-block;
}
.expand-chevron.rotated {
  transform: rotate(-90deg);
}

/* Status badges */
.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}
.status-badge--confirmed  { background: var(--success-surface); color: var(--success); }
.status-badge--canceled   { background: var(--danger-surface); color: var(--danger-fg); }
.status-badge--modified   { background: var(--warning-surface); color: var(--warning); }
.status-badge--overridden { background: var(--violet-surface); color: var(--violet); }
.status-badge--completed  { background: var(--muted); color: var(--muted-foreground); }
.status-badge--recurrent  { background: var(--info-surface); color: var(--info); }

/* Detail panel — reveal motion handled by the shared .reveal-collapse utility (motion.css) */
.reservation-detail {
  border-top: 1px solid var(--border);
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-section__title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin: 0 0 0.6rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.84rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3rem;
  gap: 0.5rem;
}
.detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

@media (max-width: 480px) {
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }
}

.detail-label {
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.detail-value {
  font-weight: 500;
  color: var(--foreground);
  text-align: right;
  word-break: break-all;
}

@media (max-width: 480px) {
  .detail-value {
    text-align: left;
    word-break: break-word;
  }
}

.detail-value--mono {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* Cancellation reason */
.detail-cancel-reason {
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  background: var(--danger-surface);
  border: 1px solid var(--danger-border);
}
.detail-cancel-reason__label {
  margin: 0 0 0.2rem;
  color: var(--danger-fg);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.detail-cancel-reason__text {
  margin: 0;
  color: var(--danger-fg);
  font-size: 0.84rem;
}

/* Recurrence List */
.recurrence-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.recurrence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}
.recurrence-item:last-child {
  border-bottom: none;
}
.recurrence-date {
  color: var(--foreground);
}
.recurrence-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Actions */
.detail-actions {
  padding-top: 0.25rem;
}

/* States */
.state-msg { color: var(--muted-foreground); font-size: 0.9rem; }
.state-error { color: var(--destructive); font-size: 0.9rem; }
.state-empty { color: var(--muted-foreground); font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
