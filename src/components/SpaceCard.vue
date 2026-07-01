<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import { TIME_SLOT_RANGES, type Blocking, type Availability } from '@/types/reservation';
import { PERIOD_COLORS, type PinStatus } from '@/composables/usePinAvailability';
import { usePermissions } from '@/composables/usePermissions';
import { useRoomDetail } from '@/composables/useRoomDetail';
import type { PeriodKey } from '@/utils/period';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EquipmentReportDialog from '@/components/EquipmentReportDialog.vue';
import RoomAvailabilityStrip from '@/components/room-popup/RoomAvailabilityStrip.vue';
import RoomSlotDetail from '@/components/room-popup/RoomSlotDetail.vue';
import RoomDetailsCollapse from '@/components/room-popup/RoomDetailsCollapse.vue';

const props = defineProps<{
  space: Space;
  status: PinStatus | undefined;
  statusLoaded: boolean;
  /** Hourly slots for the selected date, reused from the SpaceBrowser cache (no refetch). */
  availability: Availability | null;
  expanded: boolean;
  selectedPeriod: PeriodKey;
  selectedDate: string;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const router = useRouter();
const auth = useAuthStore();
const reservationStore = useReservationStore();

const { canReserve, canBlock } = usePermissions();

// Detail loading (full space fetched lazily on first expand; cached thereafter)
const detailedSpace = ref<Space | null>(null);
const detailLoading = ref(false);
const blockingReason = ref<string | null>(null);
const detailsExpanded = ref(false);

const displaySpace = computed(() => detailedSpace.value ?? props.space);

// Shared room-detail wiring — identical to RoomPopup. Availability is reused from the
// SpaceBrowser cache (external mode: no refetch); equipment/detail comes from the lazy
// getSpace via `displaySpace`.
const periodRange = computed(() => TIME_SLOT_RANGES[props.selectedPeriod]);
const availabilityRef = computed<Availability | null>(() => props.availability);
const {
  visibleSlots,
  selectedSlot,
  hasUserSelection,
  reserveStartTime,
  reserveEndTime,
  clearSelection,
  isPastSlot,
  isInSelectedRange,
  onCellClick,
  getCellClass,
  equipmentGroups,
  groupStatusClass,
  groupStatusLabel,
  reportingEquipment,
  canReport,
  openReportFor,
  onReportSent,
  typeLabel,
  purposeLabel,
  blockTypeLabel,
  formattedDate,
} = useRoomDetail({
  space: () => displaySpace.value,
  selectedDate: toRef(props, 'selectedDate'),
  defaultStartTime: () => periodRange.value.startTime,
  defaultEndTime: () => periodRange.value.endTime,
  availability: availabilityRef,
});

// Status display
const statusLabel = computed((): string => {
  if (!props.statusLoaded) return '';
  switch (props.status) {
    case 'available': return 'Disponível';
    case 'partial': return 'Parcial';
    case 'reserved': return 'Ocupado';
    case 'blocked': return 'Bloqueado';
    case 'closed': return 'Fechado';
    case 'not_reservable': return 'Indisponível';
    default: return '';
  }
});

const statusColor = computed(() =>
  props.status ? PERIOD_COLORS[props.status] : 'var(--avail-disabled)',
);

// Reserve / block state
const reserveDisabled = computed(() => {
  if (!props.space.reservable) return true;
  if (!props.status) return false;
  return ['reserved', 'blocked', 'closed', 'not_reservable'].includes(props.status);
});

const reserveDisabledReason = computed((): string | null => {
  if (!props.space.reservable) return 'Este espaço não está disponível para reservas.';
  switch (props.status) {
    case 'reserved': return 'Este espaço já está totalmente reservado neste turno.';
    case 'blocked': return 'Este espaço está bloqueado para o turno selecionado.';
    case 'closed': return 'Este espaço está fechado neste turno.';
    case 'not_reservable': return 'Este espaço não está disponível para reservas.';
    default: return null;
  }
});

async function fetchBlockingReason() {
  if (props.status === 'blocked') {
    try {
      const blockings = await api.getBlockings(auth.token, props.space.id, props.selectedDate);
      const range = TIME_SLOT_RANGES[props.selectedPeriod];
      const active = blockings.find(
        (b: Blocking) =>
          b.status === 'active' &&
          b.startTime < range.endTime &&
          b.endTime > range.startTime,
      );
      if (active) {
        const label = blockTypeLabel(active.blockType);
        blockingReason.value = active.reason?.trim()
          ? `${label}: ${active.reason}`
          : label;
      } else {
        blockingReason.value = null;
      }
    } catch {
      blockingReason.value = null;
    }
  } else {
    blockingReason.value = null;
  }
}

watch([() => props.selectedDate, () => props.selectedPeriod, () => props.status], () => {
  if (props.expanded) {
    fetchBlockingReason();
  }
});

// Fetch details on expand
async function onExpand() {
  const alreadyLoaded = !!detailedSpace.value;
  if (!alreadyLoaded) {
    detailLoading.value = true;
    try {
      detailedSpace.value = await api.getSpace(auth.token, props.space.id);
    } catch {
      // keep summary data
    }
  }

  await fetchBlockingReason();

  if (!alreadyLoaded) detailLoading.value = false;
}

function handleReserve() {
  reservationStore.setSpace(props.space.id, props.space.name);
  router.push({ name: 'reservation', params: { spaceId: props.space.id } });
}

function handleBlock() {
  router.push({ name: 'blocking-create', params: { spaceId: props.space.id } });
}

function goToReservation(reservationId: string) {
  router.push({ name: 'my-reservations', query: { highlight: reservationId } });
}

function handleToggle() {
  if (!props.expanded) onExpand();
  emit('toggle');
}
</script>

<template>
  <div
    class="space-card"
    :class="{
      'space-card--expanded': expanded,
      'space-card--dimmed': status === 'not_reservable' || !space.reservable,
    }"
  >
    <!-- Summary row -->
    <button class="space-card__summary" :aria-expanded="expanded" @click="handleToggle">
      <span
        class="status-dot"
        :class="{ 'status-dot--loading': !statusLoaded }"
        :style="statusLoaded ? { background: statusColor } : undefined"
      />
      <div class="space-card__info">
        <h3>{{ space.name }}</h3>
        <p>
          {{ space.number }}
          <span class="sep">·</span>
          {{ typeLabel }}
          <span class="sep">·</span>
          {{ space.block }}
          <span v-if="space.capacity != null" class="sep">·</span>
          <span v-if="space.capacity != null">{{ space.capacity }} pessoas</span>
        </p>
      </div>
      <div class="space-card__right">
        <span v-if="statusLoaded && statusLabel" class="status-label" :style="{ color: statusColor }">
          {{ statusLabel }}
        </span>
        <span class="expand-chevron" :class="{ rotated: expanded }">›</span>
      </div>
    </button>

    <!-- Detail panel — same-object reveal (shared .reveal-collapse utility) -->
    <div class="reveal-collapse" :class="{ 'reveal-collapse--open': expanded }">
      <div class="reveal-collapse__inner" :inert="!expanded">
        <div class="space-card__detail">
      <div v-if="detailLoading" class="space-card__detail-skeleton" role="status" aria-label="Carregando detalhes do espaço">
        <div class="stats-grid" aria-hidden="true">
          <div v-for="n in 3" :key="n" class="stat-card">
            <Skeleton class="mx-auto h-5 w-14 rounded" />
            <Skeleton class="mx-auto mt-2 h-3 w-20 rounded" />
          </div>
        </div>

        <ul class="info-list" aria-hidden="true">
          <li v-for="n in 3" :key="n">
            <Skeleton class="h-3 w-20 rounded" />
            <Skeleton class="h-3 rounded" :class="n === 1 ? 'w-28' : 'w-24'" />
          </li>
        </ul>
      </div>

      <template v-else>
        <!-- Hourly availability (same strip as the 3D popup) -->
        <RoomAvailabilityStrip
          :formatted-date="formattedDate"
          :loading="!availability"
          :visible-slots="visibleSlots"
          :selected-date="selectedDate"
          :has-user-selection="hasUserSelection"
          :reserve-start-time="reserveStartTime"
          :reserve-end-time="reserveEndTime"
          :is-past-slot="isPastSlot"
          :is-in-selected-range="isInSelectedRange"
          :get-cell-class="getCellClass"
          @cell-click="onCellClick"
          @clear-selection="clearSelection"
        />

        <!-- Clicked-slot detail -->
        <RoomSlotDetail
          :selected-slot="selectedSlot"
          :purpose-label="purposeLabel"
          :block-type-label="blockTypeLabel"
          @go-to-reservation="goToReservation"
        />

        <!-- Stats + equipment (with report) — shared with the popup -->
        <RoomDetailsCollapse
          :details-expanded="detailsExpanded"
          :space="displaySpace"
          :equipment-groups="equipmentGroups"
          :can-report="canReport"
          :group-status-class="groupStatusClass"
          :group-status-label="groupStatusLabel"
          @toggle="detailsExpanded = !detailsExpanded"
          @report="openReportFor"
        />

        <!-- Blocking notice -->
        <div v-if="blockingReason" class="blocking-notice">
          <p class="blocking-notice__label">Motivo do bloqueio</p>
          <p class="blocking-notice__text">{{ blockingReason }}</p>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <Button
            v-if="canReserve"
            class="h-11 w-full"
            :disabled="reserveDisabled"
            @click="handleReserve"
          >
            Fazer Reserva
          </Button>
          <p v-if="reserveDisabledReason" class="action-hint">{{ reserveDisabledReason }}</p>
          <Button
            v-if="canBlock"
            variant="outline"
            class="h-11 w-full"
            :disabled="!space.reservable"
            @click="handleBlock"
          >
            Bloquear Espaço
          </Button>
        </div>
      </template>
        </div>
      </div>
    </div>

    <!-- Equipment report dialog (teleports to body; not clipped by the card) -->
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
.space-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  overflow: hidden;
  transition: border-color 0.15s;
}
.space-card--expanded {
  border-color: var(--primary);
}
.space-card--dimmed {
  opacity: 0.6;
}

/* Summary */
.space-card__summary {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.85rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 0.75rem;
}
.space-card__summary:hover {
  background: var(--accent);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--avail-disabled);
}
.status-dot--loading {
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.space-card__info {
  flex: 1;
  min-width: 0;
}
.space-card__info h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.space-card__info p {
  margin: 0.15rem 0 0;
  color: var(--muted-foreground);
  font-size: 0.8rem;
}
.sep { color: var(--border); margin: 0 0.15rem; }

.space-card__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.status-label {
  font-size: 0.75rem;
  font-weight: 600;
}
.expand-chevron {
  font-size: 1.1rem;
  color: var(--muted-foreground);
  transform: rotate(90deg);
  transition: transform 0.2s ease;
  display: inline-block;
}
.expand-chevron.rotated {
  transform: rotate(-90deg);
}

/* Detail — reveal motion handled by the shared .reveal-collapse utility (motion.css) */
.space-card__detail {
  border-top: 1px solid var(--border);
  padding: 1rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.space-card__detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Stats grid — used by the loading skeleton; .stat-card styles in detail-panel.css */
.stats-grid {
  display: flex;
  gap: 0.5rem;
}

/* Info list — used by the loading skeleton; .info-label/.info-value in detail-panel.css */
.info-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.info-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}

/* Blocking notice */
.blocking-notice {
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--warning-surface);
  border: 1px solid var(--warning-border);
}
.blocking-notice__label {
  margin: 0 0 0.15rem;
  color: var(--warning);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.blocking-notice__text {
  margin: 0;
  color: var(--warning);
  font-size: 0.8rem;
}

/* Actions */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.action-hint {
  margin: 0;
  color: var(--warning);
  font-size: 0.75rem;
  text-align: center;
}
</style>
