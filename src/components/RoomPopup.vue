<script setup lang="ts">
import { computed } from 'vue';
import { SPACE_TYPE_LABELS, EQUIPMENT_STATUS_LABELS, type Space, type Equipment } from '@/types/space';
import { useAuthStore } from '@/stores/auth';
import { hasRole, CAN_RESERVE, CAN_BLOCK } from '@/utils/roles';

const props = defineProps<{
  space: Space;
  reserveDisabled?: boolean;
  reserveDisabledReason?: string | null;
  blockingReason?: string | null;
  loadingReservationState?: boolean;
}>();

defineEmits<{
  close: [];
  reserve: [];
  block: [];
}>();

const auth = useAuthStore();
const canReserve = computed(() => hasRole(auth.userRole, CAN_RESERVE));
const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));
const typeLabel = computed(() => SPACE_TYPE_LABELS[props.space.type] ?? props.space.type);

// Group equipment by name and aggregate counts + worst status
interface EquipmentGroup {
  name: string;
  total: number;
  working: number;
  broken: number;
  underRepair: number;
  replacementScheduled: number;
}

const equipmentGroups = computed((): EquipmentGroup[] => {
  if (!props.space.equipment?.length) return [];
  const map = new Map<string, EquipmentGroup>();
  for (const item of props.space.equipment) {
    const key = item.name;
    if (!map.has(key)) {
      map.set(key, { name: key, total: 0, working: 0, broken: 0, underRepair: 0, replacementScheduled: 0 });
    }
    const g = map.get(key)!;
    g.total++;
    if (item.status === 'working') g.working++;
    else if (item.status === 'broken') g.broken++;
    else if (item.status === 'under_repair') g.underRepair++;
    else if (item.status === 'replacement_scheduled') g.replacementScheduled++;
  }
  return Array.from(map.values());
});

function groupStatusClass(g: EquipmentGroup): string {
  if (g.broken > 0) return 'status--broken';
  if (g.underRepair > 0 || g.replacementScheduled > 0) return 'status--warning';
  return 'status--working';
}

function groupStatusLabel(g: EquipmentGroup): string {
  if (g.broken > 0) return `${g.broken} com defeito`;
  if (g.underRepair > 0) return 'Em manutenção';
  if (g.replacementScheduled > 0) return 'Substituição agendada';
  return 'Funcionando';
}
</script>

<template>
  <div class="room-popup-overlay" @click.self="$emit('close')">
    <div class="room-popup">
      <button class="room-popup__close" @click="$emit('close')" aria-label="Fechar">&times;</button>

      <!-- Header -->
      <h2 class="room-popup__title">{{ space.name }}</h2>
      <p class="room-popup__meta">
        <span>{{ typeLabel }}</span>
        <span class="meta-sep">·</span>
        <span>Bloco {{ space.block }}</span>
        <span v-if="space.department" class="meta-sep">·</span>
        <span v-if="space.department">{{ space.department }}</span>
      </p>

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
        <p class="room-popup__section-title">Equipamentos</p>
        <ul class="equipment-list">
          <li v-for="g in equipmentGroups" :key="g.name" class="equipment-item">
            <span class="equipment-name">
              {{ g.name }}
              <span v-if="g.total > 1" class="equipment-count">({{ g.total }})</span>
            </span>
            <span class="equipment-status" :class="groupStatusClass(g)">
              {{ groupStatusLabel(g) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Blocking reason -->
      <div v-if="blockingReason" class="room-popup__notice">
        <p class="room-popup__notice-label">Motivo do bloqueio</p>
        <p class="room-popup__notice-text">{{ blockingReason }}</p>
      </div>

      <!-- Actions -->
      <div class="room-popup__actions">
        <button
          v-if="canReserve && !reserveDisabled"
          class="btn-primary"
          :disabled="loadingReservationState"
          @click="$emit('reserve')"
        >
          Fazer Reserva
        </button>
        <p v-if="loadingReservationState" class="action-hint">Verificando disponibilidade...</p>
        <p v-else-if="reserveDisabledReason" class="action-hint action-hint--warn">{{ reserveDisabledReason }}</p>
        <button v-if="canBlock" class="btn-secondary" @click="$emit('block')">
          Bloquear Espaço
        </button>
      </div>
    </div>
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

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.room-popup {
  background: white;
  border-radius: 20px;
  padding: 1.5rem 1.5rem 1.25rem;
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  position: relative;
  animation: popup-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.room-popup__close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
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
.room-popup__close:hover {
  background: #ebebeb;
  color: #333;
}

.room-popup__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  margin: 0 2.5rem 0.25rem 0;
}

.room-popup__meta {
  color: #888;
  font-size: 0.8rem;
  margin: 0 0 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}
.meta-sep { color: #ccc; }

/* Key stats grid */
.room-popup__stats-grid {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.stat-card {
  flex: 1;
  background: #f7f9f8;
  border-radius: 12px;
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 0;
}
.stat-card__icon {
  font-size: 1.1rem;
}
.stat-card__value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111;
  text-align: center;
  line-height: 1.2;
}
.stat-card__value--sm {
  font-size: 0.78rem;
  font-weight: 600;
}
.stat-card__label {
  font-size: 0.68rem;
  color: #999;
  text-align: center;
}

/* Info list */
.room-popup__info-list {
  list-style: none;
  margin: 0 0 0.9rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.room-popup__info-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  border-bottom: 1px solid #f2f2f2;
  padding-bottom: 0.3rem;
}
.info-label { color: #999; }
.info-value { font-weight: 500; color: #222; text-align: right; max-width: 60%; }

/* Equipment section */
.room-popup__section { margin-bottom: 0.75rem; }

.room-popup__section-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #bbb;
  letter-spacing: 0.06em;
  margin: 0 0 0.5rem;
}

.equipment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.equipment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid #f5f5f5;
}
.equipment-item:last-child { border-bottom: none; }
.equipment-name { color: #333; font-weight: 500; }
.equipment-count { color: #aaa; font-weight: 400; margin-left: 0.2rem; }

.equipment-status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}
.status--working  { background: #d1fae5; color: #065f46; }
.status--broken   { background: #fee2e2; color: #991b1b; }
.status--warning  { background: #fef3c7; color: #92400e; }

/* Blocking notice */
.room-popup__notice {
  margin-bottom: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: #fff8f0;
  border-left: 3px solid #f59e0b;
}
.room-popup__notice-label {
  margin: 0 0 0.2rem;
  color: #92400e;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}
.room-popup__notice-text {
  margin: 0;
  color: #78350f;
  font-size: 0.82rem;
}

/* Actions */
.room-popup__actions {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-primary {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #178a65; }
.btn-primary:disabled { background: #b8c8c2; cursor: not-allowed; }

.btn-secondary {
  width: 100%;
  padding: 0.75rem;
  border: 1.5px solid #1D9E75;
  border-radius: 10px;
  background: none;
  color: #1D9E75;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-secondary:hover { background: #e8f5f0; }

.action-hint {
  margin: 0;
  color: #888;
  font-size: 0.78rem;
  text-align: center;
}
.action-hint--warn { color: #c05a1f; }
</style>
