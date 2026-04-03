<script setup lang="ts">
import type { Space } from '@/types/space';

defineProps<{
  space: Space;
}>();

defineEmits<{
  close: [];
  reserve: [];
}>();
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

      <div class="room-popup__actions">
        <button class="room-popup__reserve" @click="$emit('reserve')">Reservar</button>
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
.room-popup__actions {
  margin-top: 0.5rem;
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
</style>
