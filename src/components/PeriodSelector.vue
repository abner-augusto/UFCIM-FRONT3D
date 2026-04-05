<script setup lang="ts">
import type { PeriodKey } from '@/utils/period';

defineProps<{
  modelValue: PeriodKey;
  loading: boolean;
  autoDetected: boolean;
}>();

defineEmits<{
  'update:modelValue': [period: PeriodKey];
}>();
</script>

<template>
  <div class="period-selector">
    <label class="period-selector__label">
      Turno
      <span v-if="autoDetected" class="period-selector__auto-tag">automático</span>
    </label>
    <select
      class="period-selector__select"
      :value="modelValue"
      :disabled="loading"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as PeriodKey)"
    >
      <option value="morning">Manhã (07h–12h)</option>
      <option value="afternoon">Tarde (13h–18h)</option>
      <option value="evening">Noite (19h–22h)</option>
    </select>
    <span v-if="loading" class="period-selector__loading">Atualizando...</span>

    <div class="period-selector__legend">
      <span class="period-selector__legend-item">
        <span class="period-selector__dot period-selector__dot--available"></span>
        Disponível
      </span>
      <span class="period-selector__legend-item">
        <span class="period-selector__dot period-selector__dot--partial"></span>
        Parcial
      </span>
      <span class="period-selector__legend-item">
        <span class="period-selector__dot period-selector__dot--reserved"></span>
        Ocupado
      </span>
    </div>
  </div>
</template>

<style scoped>
.period-selector {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  padding: 0.6rem 0.85rem;
  min-width: 170px;
}

.period-selector__label {
  display: block;
  font-size: 0.72rem;
  color: #666;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-bottom: 0.3rem;
  text-transform: uppercase;
}

.period-selector__auto-tag {
  font-size: 0.65rem;
  background: #e8f5f0;
  color: #1D9E75;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 4px;
  font-weight: 500;
  vertical-align: middle;
}

.period-selector__select {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  appearance: auto;
}

.period-selector__select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.period-selector__loading {
  display: block;
  font-size: 0.72rem;
  color: #1D9E75;
  margin-top: 0.25rem;
}

.period-selector__legend {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.period-selector__legend-item {
  font-size: 0.72rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 3px;
}

.period-selector__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.period-selector__dot--available {
  background: #00b050;
}

.period-selector__dot--partial {
  background: #f2c200;
}

.period-selector__dot--reserved {
  background: #d32f2f;
}
</style>
