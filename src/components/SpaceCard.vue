<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useReservationStore } from '@/stores/reservation';
import { api } from '@/services/api';
import { SPACE_TYPE_LABELS, EQUIPMENT_STATUS_LABELS, type Space, type Equipment } from '@/types/space';
import { BLOCK_TYPE_LABELS, TIME_SLOT_RANGES, type Blocking } from '@/types/reservation';
import { PERIOD_COLORS, type PinStatus } from '@/composables/usePinAvailability';
import { hasRole, CAN_RESERVE, CAN_BLOCK } from '@/utils/roles';
import type { PeriodKey } from '@/utils/period';

const props = defineProps<{
  space: Space;
  status: PinStatus | undefined;
  statusLoaded: boolean;
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

const canReserve = computed(() => hasRole(auth.userRole, CAN_RESERVE));
const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));
const typeLabel = computed(() => SPACE_TYPE_LABELS[props.space.type] ?? props.space.type);

// Detail loading
const detailedSpace = ref<Space | null>(null);
const detailLoading = ref(false);
const blockingReason = ref<string | null>(null);

const displaySpace = computed(() => detailedSpace.value ?? props.space);

// Equipment grouping (same logic as RoomPopup)
interface EquipmentGroup {
  name: string;
  total: number;
  working: number;
  broken: number;
  underRepair: number;
  replacementScheduled: number;
}

const equipmentGroups = computed((): EquipmentGroup[] => {
  const equip = displaySpace.value.equipment;
  if (!equip?.length) return [];
  const map = new Map<string, EquipmentGroup>();
  for (const item of equip) {
    if (!map.has(item.name)) {
      map.set(item.name, { name: item.name, total: 0, working: 0, broken: 0, underRepair: 0, replacementScheduled: 0 });
    }
    const g = map.get(item.name)!;
    g.total++;
    if (item.status === 'working') g.working++;
    else if (item.status === 'broken') g.broken++;
    else if (item.status === 'under_repair') g.underRepair++;
    else if (item.status === 'replacement_scheduled') g.replacementScheduled++;
  }
  return Array.from(map.values());
});

function groupStatusClass(g: EquipmentGroup): string {
  if (g.broken > 0) return 'eq-status--broken';
  if (g.underRepair > 0 || g.replacementScheduled > 0) return 'eq-status--warning';
  return 'eq-status--working';
}

function groupStatusLabel(g: EquipmentGroup): string {
  if (g.broken > 0) return `${g.broken} com defeito`;
  if (g.underRepair > 0) return 'Em manutenção';
  if (g.replacementScheduled > 0) return 'Substituição agendada';
  return 'Funcionando';
}

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
  props.status ? PERIOD_COLORS[props.status] : '#ccc',
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
        const typeLabel = BLOCK_TYPE_LABELS[active.blockType];
        blockingReason.value = active.reason?.trim()
          ? `${typeLabel}: ${active.reason}`
          : typeLabel;
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
    <button class="space-card__summary" @click="handleToggle">
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

    <!-- Detail panel -->
    <div v-if="expanded" class="space-card__detail">
      <div v-if="detailLoading" class="detail-loading">Carregando detalhes...</div>

      <template v-else>
        <!-- Stats grid -->
        <div class="stats-grid">
          <div v-if="displaySpace.capacity != null" class="stat-card">
            <span class="stat-card__value">{{ displaySpace.capacity }}</span>
            <span class="stat-card__label">pessoas</span>
          </div>
          <div v-if="displaySpace.lighting" class="stat-card">
            <span class="stat-card__value stat-card__value--sm">{{ displaySpace.lighting }}</span>
            <span class="stat-card__label">iluminação</span>
          </div>
          <div v-if="displaySpace.hvac" class="stat-card">
            <span class="stat-card__value stat-card__value--sm">{{ displaySpace.hvac }}</span>
            <span class="stat-card__label">climatização</span>
          </div>
        </div>

        <!-- Info list -->
        <ul v-if="displaySpace.furniture || displaySpace.multimedia" class="info-list">
          <li v-if="displaySpace.furniture">
            <span class="info-label">Mobiliário</span>
            <span class="info-value">{{ displaySpace.furniture }}</span>
          </li>
          <li v-if="displaySpace.multimedia">
            <span class="info-label">Multimídia</span>
            <span class="info-value">{{ displaySpace.multimedia }}</span>
          </li>
        </ul>

        <!-- Equipment -->
        <div v-if="equipmentGroups.length" class="equipment-section">
          <p class="section-title">Equipamentos</p>
          <ul class="equipment-list">
            <li v-for="g in equipmentGroups" :key="g.name" class="equipment-item">
              <span class="equipment-name">
                {{ g.name }}
                <span v-if="g.total > 1" class="equipment-count">({{ g.total }})</span>
              </span>
              <span class="equipment-badge" :class="groupStatusClass(g)">
                {{ groupStatusLabel(g) }}
              </span>
            </li>
          </ul>
        </div>

        <!-- Blocking notice -->
        <div v-if="blockingReason" class="blocking-notice">
          <p class="blocking-notice__label">Motivo do bloqueio</p>
          <p class="blocking-notice__text">{{ blockingReason }}</p>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <button
            v-if="canReserve"
            class="btn-primary"
            :disabled="reserveDisabled"
            @click="handleReserve"
          >
            Fazer Reserva
          </button>
          <p v-if="reserveDisabledReason" class="action-hint">{{ reserveDisabledReason }}</p>
          <button
            v-if="canBlock"
            class="btn-secondary"
            :disabled="!space.reservable"
            @click="handleBlock"
          >
            Bloquear Espaço
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.space-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: white;
  overflow: hidden;
  transition: border-color 0.15s;
}
.space-card--expanded {
  border-color: #1D9E75;
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
  background: #f9fafb;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #ccc;
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
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.space-card__info p {
  margin: 0.15rem 0 0;
  color: #777;
  font-size: 0.8rem;
}
.sep { color: #ccc; margin: 0 0.15rem; }

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
  color: #aaa;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
  display: inline-block;
}
.expand-chevron.rotated {
  transform: rotate(-90deg);
}

/* Detail */
.space-card__detail {
  border-top: 1px solid #f0f0f0;
  padding: 1rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  animation: detail-in 0.18s ease both;
}
@keyframes detail-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.detail-loading {
  color: #888;
  font-size: 0.85rem;
}

/* Stats grid */
.stats-grid {
  display: flex;
  gap: 0.5rem;
}
.stat-card {
  flex: 1;
  background: #f7f9f8;
  border-radius: 10px;
  padding: 0.5rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
}
.stat-card__value {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  text-align: center;
  line-height: 1.2;
}
.stat-card__value--sm {
  font-size: 0.75rem;
  font-weight: 600;
}
.stat-card__label {
  font-size: 0.65rem;
  color: #999;
  text-align: center;
}

/* Info list */
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
  border-bottom: 1px solid #f2f2f2;
  padding-bottom: 0.25rem;
}
.info-label { color: #999; flex-shrink: 0; }
.info-value { font-weight: 500; color: #222; text-align: right; max-width: 60%; }

/* Equipment */
.section-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #bbb;
  letter-spacing: 0.06em;
  margin: 0 0 0.4rem;
}
.equipment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.equipment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid #f5f5f5;
}
.equipment-item:last-child { border-bottom: none; }
.equipment-name { color: #333; font-weight: 500; }
.equipment-count { color: #aaa; font-weight: 400; margin-left: 0.15rem; }
.equipment-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.eq-status--working  { background: #d1fae5; color: #065f46; }
.eq-status--broken   { background: #fee2e2; color: #991b1b; }
.eq-status--warning  { background: #fef3c7; color: #92400e; }

/* Blocking notice */
.blocking-notice {
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: #fff8f0;
  border-left: 3px solid #f59e0b;
}
.blocking-notice__label {
  margin: 0 0 0.15rem;
  color: #92400e;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.blocking-notice__text {
  margin: 0;
  color: #78350f;
  font-size: 0.8rem;
}

/* Actions */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.btn-primary {
  width: 100%;
  padding: 0.7rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #178a65; }
.btn-primary:disabled { background: #b8c8c2; cursor: not-allowed; }

.btn-secondary {
  width: 100%;
  padding: 0.65rem;
  border: 1.5px solid #1D9E75;
  border-radius: 10px;
  background: none;
  color: #1D9E75;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-secondary:hover { background: #e8f5f0; }
.btn-secondary:disabled {
  border-color: #ccc;
  color: #bbb;
  cursor: not-allowed;
}
.btn-secondary:disabled:hover { background: none; }

.action-hint {
  margin: 0;
  color: #c05a1f;
  font-size: 0.75rem;
  text-align: center;
}
</style>
