<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { SPACE_TYPE_LABELS, type Space, type Equipment } from '@/types/space';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { hasRole, CAN_RESERVE, CAN_BLOCK } from '@/utils/roles';
import { PURPOSE_LABELS, BLOCK_TYPE_LABELS, type AvailabilitySlot } from '@/types/reservation';
import EquipmentReportDialog from './EquipmentReportDialog.vue';
import { useEquipmentGroups, type EquipmentGroup } from '@/composables/useEquipmentGroups';

const props = defineProps<{
  space: Space;
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  reserveDisabled?: boolean;
  reserveDisabledReason?: string | null;
  blockingReason?: string | null;
  loadingReservationState?: boolean;
  blockingAllowed?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  reserve: [range: { startTime: string; endTime: string }];
  block: [];
}>();

const router = useRouter();
const overlayReady = ref(false);
const detailsExpanded = ref(false);
onMounted(() => setTimeout(() => { overlayReady.value = true; }, 300));

function onOverlayClick() {
  if (overlayReady.value) emit('close');
}

const auth = useAuthStore();
const canReserve = computed(() => hasRole(auth.userRole, CAN_RESERVE));
const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));
const typeLabel = computed(() => SPACE_TYPE_LABELS[props.space.type] ?? props.space.type);

// Availability data for schedule grid
const availability = ref<AvailabilitySlot[] | null>(null);
const loadingAvailability = ref(false);
const selectedSlotIndex = ref<number | null>(null); // detail panel (reserved/blocked cell)

// Hour range selection (available cells): inclusive indices into `availability`
const rangeStartIdx = ref<number | null>(null);
const rangeEndIdx = ref<number | null>(null);

// Reference timestamp for "has this hour passed" — refreshed whenever the grid loads.
const nowTs = ref(Date.now());

// A slot is in the past once its start time (in local/campus time) is at or before now.
// Works for any date: future days are never past, earlier days are always past.
function isPastSlot(slot: AvailabilitySlot) {
  return new Date(`${props.selectedDate}T${slot.startTime}:00`).getTime() <= nowTs.value;
}

async function loadAvailability() {
  selectedSlotIndex.value = null;
  rangeStartIdx.value = null;
  rangeEndIdx.value = null;
  nowTs.value = Date.now();
  loadingAvailability.value = true;
  try {
    availability.value = await api.getAvailability(auth.token, props.space.id, props.selectedDate);
  } finally {
    loadingAvailability.value = false;
  }
}

onMounted(loadAvailability);
watch(() => [props.selectedDate, props.space.id], loadAvailability);

// The backend returns all 24 hours (closed hours flagged `closed`). Show only
// the room's operational hours so the strip stays a single row instead of
// wrapping 24 cells into two rows of 12. All index-based selection below
// operates on this filtered list.
const visibleSlots = computed<AvailabilitySlot[]>(() =>
  availability.value?.filter((s) => s.status !== 'closed') ?? [],
);

const selectedSlot = computed(() => {
  if (selectedSlotIndex.value === null) return null;
  return visibleSlots.value[selectedSlotIndex.value] ?? null;
});

const hasUserSelection = computed(() => rangeStartIdx.value !== null && rangeEndIdx.value !== null);

// Selectable = available AND not already in the past.
function isSelectableAt(idx: number) {
  const s = visibleSlots.value[idx];
  return !!s && s.status === 'available' && !isPastSlot(s);
}

function rangeAllAvailable(a: number, b: number) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  for (let i = lo; i <= hi; i++) if (!isSelectableAt(i)) return false;
  return true;
}

function isInSelectedRange(idx: number) {
  if (rangeStartIdx.value === null || rangeEndIdx.value === null) return false;
  return idx >= rangeStartIdx.value && idx <= rangeEndIdx.value;
}

// Pick a contiguous run of available hours: 1st tap sets the start, a 2nd tap on
// a later still-available hour extends the range; tapping the lone start again
// clears it, and any other tap restarts at the new hour.
function selectHour(idx: number) {
  if (rangeStartIdx.value === null) {
    rangeStartIdx.value = idx;
    rangeEndIdx.value = idx;
    return;
  }
  const single = rangeStartIdx.value === rangeEndIdx.value;
  if (single && idx === rangeStartIdx.value) {
    rangeStartIdx.value = null;
    rangeEndIdx.value = null;
    return;
  }
  if (single && idx !== rangeStartIdx.value && rangeAllAvailable(rangeStartIdx.value, idx)) {
    const lo = Math.min(rangeStartIdx.value, idx);
    const hi = Math.max(rangeStartIdx.value, idx);
    rangeStartIdx.value = lo;
    rangeEndIdx.value = hi;
    return;
  }
  // restart selection at the tapped hour
  rangeStartIdx.value = idx;
  rangeEndIdx.value = idx;
}

function onCellClick(slot: AvailabilitySlot, idx: number) {
  if (slot.status === 'reserved' || slot.status === 'blocked') {
    selectedSlotIndex.value = selectedSlotIndex.value === idx ? null : idx;
    return;
  }
  if (slot.status === 'available') {
    if (isPastSlot(slot)) return; // hour already passed — not bookable
    selectedSlotIndex.value = null; // close any open detail
    selectHour(idx);
  }
  // closed / not_reservable: ignore
}

function getCellClass(slot: AvailabilitySlot, idx: number) {
  const past = isPastSlot(slot);
  const inUserRange = hasUserSelection.value && isInSelectedRange(idx);
  const isInDefault = !hasUserSelection.value && !past
    && slot.startTime >= props.selectedStartTime && slot.startTime < props.selectedEndTime;
  return {
    'hour-cell--green': slot.status === 'available',
    'hour-cell--red': slot.status === 'reserved',
    'hour-cell--amber': slot.status === 'blocked',
    'hour-cell--past': past,
    'hour-cell--selected': inUserRange && slot.status === 'available' && !past,
    'hour-cell--default-selected': isInDefault && slot.status === 'available',
    'hour-cell--clicked': selectedSlotIndex.value === idx,
  };
}

// The range the reserve button will use: the user's pick, else the default period.
const reserveStartTime = computed(() =>
  hasUserSelection.value && visibleSlots.value[rangeStartIdx.value!]
    ? visibleSlots.value[rangeStartIdx.value!].startTime
    : props.selectedStartTime,
);
const reserveEndTime = computed(() =>
  hasUserSelection.value && visibleSlots.value[rangeEndIdx.value!]
    ? visibleSlots.value[rangeEndIdx.value!].endTime
    : props.selectedEndTime,
);

function emitReserve() {
  emit('reserve', { startTime: reserveStartTime.value, endTime: reserveEndTime.value });
}

function purposeLabel(p: string) {
  return PURPOSE_LABELS[p] ?? p;
}

function blockTypeLabel(bt: string) {
  return BLOCK_TYPE_LABELS[bt as keyof typeof BLOCK_TYPE_LABELS] ?? bt;
}

function statusLabel(slot: AvailabilitySlot): string {
  const labels: Record<string, string> = {
    available: 'Disponível',
    reserved: 'Reservado',
    blocked: 'Bloqueado',
    closed: 'Fechado',
    not_reservable: 'Não reservável',
  };
  return labels[slot.status] ?? slot.status;
}

function goToReservation(reservationId: string) {
  router.push({ name: 'my-reservations', query: { highlight: reservationId } });
}

function goToReport() {
  router.push({ name: 'space-report', params: { spaceId: props.space.id } });
}

const formattedDate = computed(() => {
  const d = new Date(props.selectedDate + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', weekday: 'short' });
});

// Equipment groups (shared with SpaceCard)
const { equipmentGroups, groupSeverity, groupStatusLabel } = useEquipmentGroups(() => props.space);
const groupStatusClass = (g: EquipmentGroup) => `eq-status--${groupSeverity(g)}`;

// Equipment reporting
const reportingEquipment = ref<Equipment | null>(null);
const canReport = computed(() => !!auth.token);

function openReportFor(group: EquipmentGroup) {
  if (!props.space.equipment) return;
  const item = props.space.equipment.find(e => e.name === group.name);
  if (item) reportingEquipment.value = item;
}

function onReportSent() {
  reportingEquipment.value = null;
}
</script>

<template>
  <div class="room-popup-overlay" @click.self="onOverlayClick">
    <div class="room-popup">
      <button class="room-popup__close" @click="$emit('close')" aria-label="Fechar popup">&times;</button>

      <!-- Header -->
      <h2 class="room-popup__title">
        {{ space.name }}
        <span class="room-popup__number">{{ space.number }}</span>
      </h2>
      <p class="room-popup__meta">
        <span>{{ typeLabel }}</span>
        <span class="meta-sep">·</span>
        <span>{{ space.block.startsWith('Bloco') ? space.block : `Bloco ${space.block}` }}</span>
        <span v-if="space.department" class="meta-sep">·</span>
        <span v-if="space.department">{{ space.department }}</span>
      </p>

      <!-- Schedule grid -->
      <section class="room-popup__schedule">
        <div class="schedule-head">
          <span>Disponibilidade · {{ formattedDate }}</span>
          <span class="schedule-hint">toque nas horas livres</span>
        </div>
        <div v-if="loadingAvailability" class="schedule-loading">Carregando...</div>
        <template v-else-if="visibleSlots.length">
          <div class="hour-grid">
            <button
              v-for="(slot, idx) in visibleSlots" :key="slot.startTime"
              class="hour-cell"
              :class="getCellClass(slot, idx)"
              :disabled="slot.status === 'available' && isPastSlot(slot)"
              :aria-pressed="isInSelectedRange(idx)"
              :aria-label="`${slot.startTime} a ${slot.endTime}: ${statusLabel(slot)}${isPastSlot(slot) ? ' (horário já passou)' : ''}`"
              @click="onCellClick(slot, idx)"
            >
              <span v-if="slot.status === 'reserved' || slot.status === 'blocked'" class="dot">●</span>
            </button>
          </div>
          <div class="hour-axis">
            <span v-for="slot in visibleSlots" :key="slot.startTime">
              {{ parseInt(slot.startTime.split(':')[0]) }}
            </span>
          </div>
          <p v-if="hasUserSelection" class="schedule-selection">
            Horário selecionado: <strong>{{ reserveStartTime }}–{{ reserveEndTime }}</strong>
            <button class="schedule-selection__clear" @click="rangeStartIdx = null; rangeEndIdx = null">limpar</button>
          </p>
        </template>
      </section>

      <!-- Slot detail -->
      <section v-if="selectedSlot && (selectedSlot.reservation || selectedSlot.blocking)" class="slot-detail" :class="selectedSlot.status === 'blocked' ? 'slot-detail--blocked' : 'slot-detail--reserved'">
        <div class="slot-detail-head">
          <span class="slot-time">{{ selectedSlot.startTime }} – {{ selectedSlot.endTime }}</span>
          <span v-if="selectedSlot.reservation?.isRecurring" class="slot-badge slot-badge--recurring">🔁 Recorrente</span>
          <span v-if="selectedSlot.reservation?.isSelf" class="slot-badge slot-badge--own">Sua reserva</span>
        </div>

        <template v-if="selectedSlot.reservation">
          <div class="slot-purpose">
            <strong>{{ purposeLabel(selectedSlot.reservation.purpose) }}</strong>
            <span v-if="selectedSlot.reservation.description"> · {{ selectedSlot.reservation.description }}</span>
          </div>
          <div class="slot-author">
            <template v-if="selectedSlot.reservation.isSelf">
              <a class="slot-link" @click="goToReservation(selectedSlot.reservation!.id)">Gerenciar reserva →</a>
            </template>
            <template v-else>
              Reservada por <strong>{{ selectedSlot.reservation.author.displayName }}</strong>
            </template>
          </div>
        </template>

        <template v-else-if="selectedSlot.blocking">
          <div class="slot-purpose">
            <strong>{{ blockTypeLabel(selectedSlot.blocking.blockType) }}</strong>
            <span v-if="selectedSlot.blocking.reason"> · {{ selectedSlot.blocking.reason }}</span>
          </div>
          <div class="slot-author">
            Bloqueado por {{ selectedSlot.blocking.author.displayName }}
          </div>
        </template>
      </section>

      <!-- Details toggle -->
      <button class="details-toggle" @click="detailsExpanded = !detailsExpanded" :aria-expanded="detailsExpanded">
        <span>{{ detailsExpanded ? 'Menos detalhes' : 'Mais detalhes' }}</span>
        <span class="details-toggle__chevron" :class="{ rotated: detailsExpanded }">›</span>
      </button>

      <Transition name="details-collapse">
        <div v-if="detailsExpanded" class="room-popup__details">
          <!-- Key stats row -->
          <div class="room-popup__stats-grid">
            <div v-if="space.capacity != null" class="stat-card">
              <span class="stat-card__icon">👥</span>
              <span class="stat-card__value">{{ space.capacity }}</span>
              <span class="stat-card__label">pessoas</span>
            </div>
            <div v-if="space.lighting" class="stat-card">
              <span class="stat-card__icon">💡</span>
              <span class="stat-card__value stat-card__value--sm">{{ space.lighting }}</span>
              <span class="stat-card__label">iluminação</span>
            </div>
            <div v-if="space.hvac" class="stat-card">
              <span class="stat-card__icon">❄️</span>
              <span class="stat-card__value stat-card__value--sm">{{ space.hvac }}</span>
              <span class="stat-card__label">climatização</span>
            </div>
          </div>

          <!-- Additional info -->
          <ul v-if="space.furniture || space.multimedia" class="room-popup__info-list">
            <li v-if="space.furniture">
              <span class="info-label">Mobiliário</span>
              <span class="info-value">{{ space.furniture }}</span>
            </li>
            <li v-if="space.multimedia">
              <span class="info-label">Multimídia</span>
              <span class="info-value">{{ space.multimedia }}</span>
            </li>
          </ul>

          <!-- Equipment -->
          <div v-if="equipmentGroups.length" class="room-popup__section">
            <p class="detail-section-title">Equipamentos</p>
            <ul class="equipment-list">
              <li v-for="g in equipmentGroups" :key="g.name" class="equipment-item">
                <span class="equipment-name">
                  {{ g.name }}
                  <span v-if="g.total > 1" class="equipment-count">({{ g.total }})</span>
                </span>
                <span class="equipment-badge" :class="groupStatusClass(g)">
                  {{ groupStatusLabel(g) }}
                </span>
                <button
                  v-if="canReport"
                  class="equipment-report-btn"
                  :aria-label="`Reportar problema em ${g.name}`"
                  @click="openReportFor(g)"
                >
                  <span aria-hidden="true">🚩</span>
                  <span>Reportar</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </Transition>

      <!-- Blocking reason -->
      <div v-if="blockingReason" class="room-popup__notice">
        <p class="room-popup__notice-label">Motivo do bloqueio</p>
        <p class="room-popup__notice-text">{{ blockingReason }}</p>
      </div>

      <!-- Actions -->
      <div class="room-popup__actions">
        <button
          v-if="canReserve"
          class="btn-primary"
          :disabled="reserveDisabled || loadingReservationState"
          :aria-label="`Reservar das ${reserveStartTime} às ${reserveEndTime}`"
          @click="emitReserve"
        >
          Reservar {{ reserveStartTime }}–{{ reserveEndTime }}
        </button>
        <p v-if="loadingReservationState" class="action-hint">Verificando disponibilidade...</p>
        <p v-else-if="reserveDisabledReason" class="action-hint action-hint--warn">{{ reserveDisabledReason }}</p>
        <button
          v-if="canBlock"
          class="btn-secondary"
          :disabled="blockingAllowed === false"
          aria-label="Bloquear espaço"
          @click="$emit('block')"
        >
          Bloquear Espaço
        </button>
        <button class="btn-tertiary" aria-label="Ver relatório de ocupação" @click="goToReport">
          📊 Ver relatório
        </button>
      </div>
    </div>

    <EquipmentReportDialog
      v-if="reportingEquipment"
      :equipment="reportingEquipment"
      :space-name="space.name"
      @close="reportingEquipment = null"
      @reported="onReportSent"
    />
  </div>
</template>

<style scoped>
.room-popup-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1.25rem;
  z-index: 200;
  animation: overlay-in 0.25s ease both;
}

@media (max-width: 1023px) {
  .room-popup-overlay {
    position: fixed;
    z-index: 400;
  }
}

@keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }

.room-popup {
  background: white;
  border-radius: 20px;
  padding: 1.5rem 1.5rem 1.25rem;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  position: relative;
  animation: popup-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.room-popup::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 1rem;
}

@keyframes popup-in {
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.room-popup__close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-popup__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  margin: 0 2.5rem 0.25rem 0;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.room-popup__number { font-size: 0.8rem; font-weight: 500; color: #999; }
.room-popup__meta { color: #888; font-size: 0.8rem; margin: 0 0 0.75rem; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
.meta-sep { color: #ccc; }

/* Schedule */
/* Details toggle */
.details-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-link, #185FA5);
}
.details-toggle__chevron {
  font-size: 1rem;
  transition: transform 0.2s ease;
  transform: rotate(90deg);
}
.details-toggle__chevron.rotated {
  transform: rotate(-90deg);
}
.room-popup__details {
  display: flex;
  flex-direction: column;
}
.details-collapse-enter-active,
.details-collapse-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden;
}
.details-collapse-enter-from,
.details-collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.details-collapse-enter-to,
.details-collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

.room-popup__schedule { margin-bottom: 1rem; }
.schedule-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #bbb; letter-spacing: 0.06em; }
.schedule-hint { font-weight: 400; text-transform: none; color: #ccc; font-size: 0.62rem; }
.schedule-loading { font-size: 0.72rem; color: #999; }

.hour-grid { display: flex; gap: 2px; margin-bottom: 3px; }
.hour-cell { flex: 1; min-width: 0; height: 24px; border: none; border-radius: 3px; cursor: pointer; position: relative; padding: 0; background: transparent; }
.hour-cell--green { background: rgba(99,153,34,0.25); }
.hour-cell--red { background: rgba(226,75,74,0.25); }
.hour-cell--red:hover { background: rgba(226,75,74,0.4); }
.hour-cell--amber { background: rgba(186,117,23,0.3); }
.hour-cell--past { opacity: 0.4; }
.hour-cell--past.hour-cell--green { cursor: default; }
.hour-cell--default-selected { background: rgba(99,153,34,0.45); border: 1px dashed #639922; }
.hour-cell--selected { background: var(--color-brand); border: 1.5px solid var(--color-brand-dark); }
.hour-cell--clicked { outline: 2px solid var(--color-link); outline-offset: 1px; }
.hour-cell .dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8px; color: #501313; }

.hour-axis { display: flex; gap: 2px; font-size: 0.6rem; color: #aaa; }
.hour-axis span { flex: 1; min-width: 0; text-align: center; }

.schedule-selection { margin: 6px 0 0; font-size: 0.78rem; color: #444; display: flex; align-items: center; gap: 8px; }
.schedule-selection strong { color: #111; }
.schedule-selection__clear { border: none; background: none; color: var(--color-link); font-size: 0.74rem; cursor: pointer; padding: 0; text-decoration: underline; }

/* Slot detail */
.slot-detail { padding: 8px 10px; border-radius: 8px; margin-top: 6px; margin-bottom: 6px; font-size: 0.78rem; }
.slot-detail--reserved { background: #fdf2f2; border: 1px solid #f5c6cb; }
.slot-detail--blocked { background: #fff8f0; border: 1px solid #fce4c2; }
.slot-detail-head { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.slot-time { font-weight: 600; color: #333; }
.slot-badge { font-size: 0.62rem; padding: 1px 6px; border-radius: 999px; font-weight: 600; }
.slot-badge--recurring { background: #e0f2fe; color: #0369a1; }
.slot-badge--own { background: #d1fae5; color: #065f46; }
.slot-purpose { margin-bottom: 2px; color: #333; }
.slot-author { color: #666; }
.slot-link { color: var(--color-link); cursor: pointer; }

/* Stats grid — .stat-card styles in detail-panel.css */
.room-popup__stats-grid { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
@media (max-width: 480px) { .room-popup__stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 0.5rem; } }

/* Info list — .info-label/.info-value in detail-panel.css */
.room-popup__info-list { list-style: none; margin: 0 0 0.9rem; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.room-popup__info-list li { display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px solid #f2f2f2; padding-bottom: 0.3rem; }

/* Equipment — styles in detail-panel.css */
.room-popup__section { margin-bottom: 0.75rem; }

/* Equipment report button */
.equipment-report-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 0.72rem;
  background: transparent;
  border: 0.5px solid #ddd;
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  min-height: 32px;
  flex-shrink: 0;
}
.equipment-report-btn:hover {
  background: #fafafa;
  color: var(--color-danger);
  border-color: #e0a89f;
}

/* Blocking notice */
.room-popup__notice { margin-bottom: 0.75rem; padding: 0.7rem 0.9rem; border-radius: 10px; background: #fff8f0; border: 1px solid #fce4c2; }
.room-popup__notice-label { margin: 0 0 0.2rem; color: #92400e; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
.room-popup__notice-text { margin: 0; color: #78350f; font-size: 0.82rem; }

/* Actions */
.room-popup__actions { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
/* .btn-primary / .btn-secondary / .btn-tertiary are defined globally in src/styles/base.css */
.action-hint { margin: 0; color: #888; font-size: 0.78rem; text-align: center; }
.action-hint--warn { color: #c05a1f; }
</style>
