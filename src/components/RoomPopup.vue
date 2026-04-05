<script setup lang="ts">
import { computed } from 'vue';
import { SPACE_TYPE_LABELS, type Space } from '@/types/space';
import { useAuthStore } from '@/stores/auth';
import { hasRole, CAN_RESERVE, CAN_BLOCK } from '@/utils/roles';

const props = defineProps<{
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
const typeLabel = computed(() => SPACE_TYPE_LABELS[props.space.type] ?? props.space.type);
const openHours = computed(() => {
  if (!props.space.closedFrom || !props.space.closedTo) return null;
  return `${props.space.closedTo} – ${props.space.closedFrom}`;
});
</script>

<template>
  <div class="room-popup-overlay" @click.self="$emit('close')">
    <div class="room-popup">
      <button class="room-popup__close" @click="$emit('close')">&times;</button>
      <h2>{{ space.name }}</h2>
      <p class="room-popup__meta">Bloco {{ space.block }} · {{ space.campus }}</p>
      <p v-if="space.department" class="room-popup__meta">{{ space.department }}</p>

      <ul class="room-popup__stats">
        <li v-if="typeLabel">
          <span class="stat-label">Tipo</span>
          <span class="stat-value">{{ typeLabel }}</span>
        </li>
        <li v-if="space.capacity != null">
          <span class="stat-label">Capacidade</span>
          <span class="stat-value">{{ space.capacity }} pessoas</span>
        </li>
        <li v-if="space.furniture">
          <span class="stat-label">Mobiliário</span>
          <span class="stat-value">{{ space.furniture }}</span>
        </li>
        <li v-if="space.lighting">
          <span class="stat-label">Iluminação</span>
          <span class="stat-value">{{ space.lighting }}</span>
        </li>
        <li v-if="space.hvac">
          <span class="stat-label">Climatização</span>
          <span class="stat-value">{{ space.hvac }}</span>
        </li>
        <li v-if="space.multimedia">
          <span class="stat-label">Multimídia</span>
          <span class="stat-value">{{ space.multimedia }}</span>
        </li>
        <li v-if="openHours">
          <span class="stat-label">Horário de funcionamento</span>
          <span class="stat-value">{{ openHours }}</span>
        </li>
      </ul>
      <p v-if="space.description" class="room-popup__description">{{ space.description }}</p>

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
.room-popup__description {
  color: #666;
  font-size: 0.85rem;
  margin: 0.75rem 0 0;
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
