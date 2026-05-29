<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { Space } from '@/types/space';
import type { AvailabilitySlot } from '@/types/reservation';

const props = defineProps<{
  visible: boolean;
  blockName: string;
  dateLabel: string;
  spaces: Space[];
  date: string;
  closedFrom?: string;
  closedTo?: string;
}>();

const auth = useAuthStore();
const collapsed = ref(false);
const loading = ref(false);
const hours = ref<Array<{ hour: string; occupiedCount: number; totalCount: number; cssClass: string; tooltip: string }>>([]);
const stats = ref({ free: 0, partial: 0, occupied: 0 });
const firstHour = ref('07');
const midHour = ref('15');
const lastHour = ref('22');
let loadSeq = 0;

async function loadHeatmap() {
  if (!props.visible || props.spaces.length === 0) return;
  const seq = ++loadSeq;
  loading.value = true;
  try {
    const results = await Promise.allSettled(
      props.spaces.map(s => api.getAvailability(auth.token, s.id, props.date))
    );
    if (seq !== loadSeq) return; // stale request guard

    const closedFrom = props.closedFrom ?? '07:00';
    const closedTo = props.closedTo ?? '23:00';
    const startH = parseInt(closedFrom.split(':')[0], 10);
    const endH = parseInt(closedTo.split(':')[0], 10);
    firstHour.value = String(startH);
    lastHour.value = String(endH - 1);
    midHour.value = String(Math.floor((startH + endH) / 2));

    const hourData: Array<{ hour: string; occupiedCount: number; totalCount: number }> = [];
    for (let h = startH; h < endH; h++) {
      const key = `${String(h).padStart(2, '0')}:00`;
      let occupied = 0;
      let total = 0;
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const slots: AvailabilitySlot[] = r.value;
        const slot = slots.find(s => s.startTime === key);
        if (!slot || slot.status === 'closed' || slot.status === 'not_reservable') return;
        total++;
        if (slot.status === 'reserved' || slot.status === 'blocked') occupied++;
      });
      hourData.push({ hour: key, occupiedCount: occupied, totalCount: total });
    }

    hours.value = hourData.map(h => {
      const ratio = h.totalCount > 0 ? h.occupiedCount / h.totalCount : 0;
      let cssClass = 'cell--green';
      if (ratio > 0.7) cssClass = 'cell--red';
      else if (ratio > 0.3) cssClass = 'cell--amber';
      return { ...h, cssClass, tooltip: `${h.occupiedCount}/${h.totalCount} ocupadas às ${h.hour}` };
    });

    // Stats
    let freeCount = 0, partialCount = 0, occupiedCount = 0;
    results.forEach((r) => {
      if (r.status !== 'fulfilled') return;
      const slots: AvailabilitySlot[] = r.value;
      const filtered = slots.filter(s => {
        const h = parseInt(s.startTime.split(':')[0], 10);
        return h >= startH && h < endH && s.status !== 'closed' && s.status !== 'not_reservable';
      });
      const hasReserved = filtered.some(s => s.status === 'reserved');
      const hasAvailable = filtered.some(s => s.status === 'available');
      if (!hasReserved && hasAvailable) freeCount++;
      else if (hasReserved && hasAvailable) partialCount++;
      else if (hasReserved) occupiedCount++;
      else occupiedCount++; // fully blocked — count as occupied
    });
    stats.value = { free: freeCount, partial: partialCount, occupied: occupiedCount };
  } finally {
    loading.value = false;
  }
}

watch(() => [props.visible, props.date, props.spaces], loadHeatmap, { immediate: true });
</script>

<template>
  <Transition name="heatmap">
    <div v-if="visible" class="heatmap-card" :class="{ 'heatmap-card--collapsed': collapsed }">
      <div class="heatmap-head" @click="collapsed = !collapsed">
        <span class="heatmap-title">{{ blockName }} · {{ dateLabel }}</span>
        <span class="heatmap-chevron">{{ collapsed ? '▼' : '▲' }}</span>
      </div>

      <div v-if="!collapsed" class="heatmap-body">
        <div v-if="loading" class="heatmap-loading">Carregando...</div>
        <template v-else>
          <div class="heatmap-bar">
            <div
              v-for="hour in hours" :key="hour.hour"
              class="heatmap-cell"
              :class="hour.cssClass"
              :title="hour.tooltip"
            ></div>
          </div>
          <div class="heatmap-axis">
            <span>{{ firstHour }}h</span>
            <span>{{ midHour }}h</span>
            <span>{{ lastHour }}h</span>
          </div>
          <div class="heatmap-foot">
            <strong>{{ stats.free }} livres</strong>
            · {{ stats.partial }} parciais
            · {{ stats.occupied }} ocupadas
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.heatmap-card {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 185px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 250;
  pointer-events: auto;
}

@media (min-width: 481px) {
  .heatmap-card { display: none; }
}

.heatmap-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.heatmap-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: #333;
}

.heatmap-chevron {
  font-size: 0.65rem;
  color: #999;
}

.heatmap-body {
  margin-top: 6px;
}

.heatmap-loading {
  font-size: 0.7rem;
  color: #999;
}

.heatmap-bar {
  display: flex;
  gap: 1px;
  height: 16px;
}

.heatmap-cell {
  flex: 1;
  border-radius: 2px;
}

.cell--green { background: rgba(99, 153, 34, 0.5); }
.cell--amber { background: rgba(186, 117, 23, 0.5); }
.cell--red   { background: rgba(226, 75, 74, 0.5); }

.heatmap-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.55rem;
  color: #aaa;
  margin-top: 2px;
}

.heatmap-foot {
  font-size: 0.6rem;
  color: #666;
  margin-top: 4px;
  white-space: nowrap;
}

.heatmap-enter-active,
.heatmap-leave-active {
  transition: opacity 0.2s ease;
}
.heatmap-enter-from,
.heatmap-leave-to {
  opacity: 0;
}
</style>
