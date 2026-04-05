<script setup lang="ts">
import { computed } from 'vue';
import type { Space } from '@/types/space';
import { useAuthStore } from '@/stores/auth';
import { hasRole, CAN_RESERVE, CAN_BLOCK } from '@/utils/roles';

defineProps<{
  space: Space;
}>();

defineEmits<{
  close: [];
  reserve: [];
  block: [];
}>();

const auth = useAuthStore();
const canReserve = computed(() => hasRole(auth.userRole, CAN_RESERVE));
const canBlock = computed(() => hasRole(auth.userRole, CAN_BLOCK));

const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  operational: 'Operacional',
  under_maintenance: 'Em manutenção',
  decommissioned: 'Desativado',
};
</script>

<template>
  <div class="room-popup-overlay" @click.self="$emit('close')">
    <div class="room-popup">
      <button class="room-popup__close" @click="$emit('close')">&times;</button>
      <h2>{{ space.name }}</h2>
      <p class="room-popup__meta">{{ space.building }} — Andar {{ space.floor ?? '–' }}</p>

      <ul class="room-popup__stats">
        <li v-if="space.capacity != null">
          <span class="stat-label">Capacidade</span>
          <span class="stat-value">{{ space.capacity }} pessoas</span>
        </li>
        <li v-if="space.type">
          <span class="stat-label">Tipo</span>
          <span class="stat-value">{{ space.type }}</span>
        </li>
        <li v-if="space.description">
          <span class="stat-label">Descrição</span>
          <span class="stat-value">{{ space.description }}</span>
        </li>
      </ul>

      <!-- Equipment section -->
      <div v-if="space.equipment && space.equipment.length > 0" class="room-popup__equipment">
        <p class="equipment-heading">Equipamentos</p>
        <ul class="equipment-list">
          <li v-for="item in space.equipment" :key="item.id" class="equipment-item">
            <span class="equipment-name">{{ item.name }}</span>
            <span
              class="equipment-badge"
              :class="`equipment-badge--${item.status}`"
            >
              {{ EQUIPMENT_STATUS_LABELS[item.status] ?? item.status }}
            </span>
          </li>
        </ul>
      </div>

      <div class="room-popup__actions">
        <button v-if="canReserve" class="room-popup__reserve" @click="$emit('reserve')">
          Fazer Reserva
        </button>
        <button v-if="canBlock" class="room-popup__block" @click="$emit('block')">
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
  padding: 2rem;
  z-index: 200;
}
.room-popup {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
}
.room-popup__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}
.room-popup__meta {
  color: #666;
  font-size: 0.85rem;
  margin: 0.25rem 0 1rem;
}
.room-popup__stats {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.room-popup__stats li {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.4rem;
}
.stat-label {
  color: #888;
}
.stat-value {
  font-weight: 500;
  color: #222;
}
.room-popup__equipment {
  margin-bottom: 1.25rem;
}
.equipment-heading {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin: 0 0 0.5rem;
}
.equipment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.equipment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}
.equipment-name {
  color: #333;
}
.equipment-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
}
.equipment-badge--operational {
  background: #e8f5f0;
  color: #1D9E75;
}
.equipment-badge--under_maintenance {
  background: #fff8e1;
  color: #f59e0b;
}
.equipment-badge--decommissioned {
  background: #f5f5f5;
  color: #888;
}
.room-popup__actions {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.room-popup__reserve {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: #1D9E75;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}
.room-popup__reserve:hover {
  background: #178a65;
}
.room-popup__block {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #1D9E75;
  border-radius: 8px;
  background: none;
  color: #1D9E75;
  font-size: 1rem;
  cursor: pointer;
}
.room-popup__block:hover {
  background: #e8f5f0;
}
</style>
