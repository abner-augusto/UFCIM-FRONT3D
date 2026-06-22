<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
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
      results.forEach((r) => {
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
    <!-- Positioning is provided by the parent (.viewer-topleft stack in ViewerView). -->
    <div v-if="visible" class="pointer-events-auto w-[185px] rounded-lg bg-background/95 px-2.5 py-2 shadow-[0_2px_8px_rgb(var(--shadow-color)/0.15)]">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-between bg-transparent text-left"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <span class="text-[0.72rem] font-semibold text-foreground">{{ blockName }} · {{ dateLabel }}</span>
        <span class="text-[0.65rem] text-muted-foreground"><component :is="collapsed ? ChevronDown : ChevronUp" :size="10" /></span>
      </button>

      <div v-if="!collapsed" class="mt-1.5">
        <div v-if="loading" class="text-[0.7rem] text-muted-foreground">Carregando...</div>
        <template v-else>
          <div class="flex h-4 gap-px">
            <div
              v-for="hour in hours" :key="hour.hour"
              class="flex-1 rounded-[2px]"
              :class="hour.cssClass"
              :title="hour.tooltip"
            ></div>
          </div>
          <div class="mt-0.5 flex justify-between text-[0.55rem] text-muted-foreground">
            <span>{{ firstHour }}h</span>
            <span>{{ midHour }}h</span>
            <span>{{ lastHour }}h</span>
          </div>
          <div class="mt-1 text-[0.6rem] whitespace-nowrap text-muted-foreground">
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
/* Dynamic occupancy cell colors (class string built in JS) + entrance transition. */
.cell--green { background: color-mix(in srgb, var(--avail-free) 50%, transparent); }
.cell--amber { background: color-mix(in srgb, var(--avail-blocked) 50%, transparent); }
.cell--red   { background: color-mix(in srgb, var(--avail-reserved) 50%, transparent); }

.heatmap-enter-active,
.heatmap-leave-active {
  transition: opacity 0.2s ease;
}
.heatmap-enter-from,
.heatmap-leave-to {
  opacity: 0;
}
</style>
