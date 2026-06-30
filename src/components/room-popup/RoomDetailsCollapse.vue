<script setup lang="ts">
import type { Space } from '@/types/space';
import type { EquipmentGroup } from '@/composables/useEquipmentGroups';
import { Users, Lightbulb, Snowflake, Flag } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

defineProps<{
  detailsExpanded: boolean;
  space: Space;
  equipmentGroups: EquipmentGroup[];
  canReport: boolean;
  groupStatusClass: (group: EquipmentGroup) => string;
  groupStatusLabel: (group: EquipmentGroup) => string;
}>();

const emit = defineEmits<{
  toggle: [];
  report: [group: EquipmentGroup];
}>();
</script>

<template>
  <!-- Details toggle -->
  <button class="details-toggle" @click="emit('toggle')" :aria-expanded="detailsExpanded">
    <span>{{ detailsExpanded ? 'Menos detalhes' : 'Mais detalhes' }}</span>
    <span class="details-toggle__chevron" :class="{ rotated: detailsExpanded }">›</span>
  </button>

  <div class="details-collapse" :class="{ 'details-collapse--open': detailsExpanded }">
    <div class="details-collapse__inner" :inert="!detailsExpanded">
      <div class="room-popup__details">
      <!-- Key stats row -->
      <div class="room-popup__stats-grid">
        <div v-if="space.capacity != null" class="stat-card">
          <span class="stat-card__icon"><Users :size="18" /></span>
          <span class="stat-card__value">{{ space.capacity }}</span>
          <span class="stat-card__label">pessoas</span>
        </div>
        <div v-if="space.lighting" class="stat-card">
          <span class="stat-card__icon"><Lightbulb :size="18" /></span>
          <span class="stat-card__value stat-card__value--sm">{{ space.lighting }}</span>
          <span class="stat-card__label">iluminação</span>
        </div>
        <div v-if="space.hvac" class="stat-card">
          <span class="stat-card__icon"><Snowflake :size="18" /></span>
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
        <Button
          v-if="canReport"
          type="button"
          variant="outline"
          class="equipment-report-btn"
          :aria-label="`Reportar problema em ${g.name}`"
          @click="emit('report', g)"
            >
          <span aria-hidden="true"><Flag :size="12" /></span>
          <span>Reportar</span>
        </Button>
          </li>
        </ul>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  color: var(--color-link);
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
/* Collapse via grid-template-rows 0fr→1fr: the panel reveals to its true content
   height (no hardcoded max-height to clip tall rooms) and never animates layout
   box height directly. The inner wrapper clips the overflow during the slide. */
.details-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows var(--duration-slow, 0.3s) var(--ease-out-quart, ease),
              opacity var(--duration-med, 0.22s) ease;
}
.details-collapse--open {
  grid-template-rows: 1fr;
  opacity: 1;
}
.details-collapse__inner {
  overflow: hidden;
  min-height: 0;
}

/* Stats grid — .stat-card styles in detail-panel.css */
.room-popup__stats-grid { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
@media (max-width: 480px) { .room-popup__stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 0.5rem; } }

/* Info list — .info-label/.info-value in detail-panel.css */
.room-popup__info-list { list-style: none; margin: 0 0 0.9rem; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.room-popup__info-list li { display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }

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
  border: 0.5px solid var(--border);
  border-radius: 6px;
  color: var(--muted-foreground);
  cursor: pointer;
  min-height: 32px;
  flex-shrink: 0;
}
.equipment-report-btn:hover {
  background: var(--muted);
  color: var(--color-danger);
  border-color: var(--danger-border);
}
</style>
