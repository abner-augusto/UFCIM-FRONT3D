<script setup lang="ts">
import { computed } from 'vue';
import { CalendarClock, Hourglass, Repeat, Timer, Wrench, X } from '@lucide/vue';
import {
  EQUIPMENT_STATUS_LABELS,
  type EquipmentMaintenanceReport,
} from '@/types/maintenance-history';
import { formatDays, formatHours } from '@/utils/maintenance-history';
import { formatDateShort, toLocalISODate } from '@/utils/date';
import { roomLabel, blockLabel } from '@/utils/space-labels';
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import BarChart from '@/components/reports/BarChart.vue';
import MaintenanceSummary from '@/components/reports/MaintenanceSummary.vue';
import MaintenanceTimeline from '@/components/reports/MaintenanceTimeline.vue';
import ChartCardSkeleton from '@/components/ChartCardSkeleton.vue';

const props = defineProps<{
  report: EquipmentMaintenanceReport | null;
  loading: boolean;
  error: string | null;
}>();
const emit = defineEmits<{ close: [] }>();

const { isDark } = useDarkMode();

const location = computed(() => {
  const space = props.report?.equipment.space;
  if (!space) return '';
  return [roomLabel(space), blockLabel(space.block), space.department].filter(Boolean).join(' · ');
});

const cards = computed(() => {
  const s = props.report?.summary;
  if (!s) return [];
  return [
    { label: 'Tempo com defeito', value: formatDays(s.timeInBrokenDays), icon: Wrench },
    { label: 'Tempo médio até a análise', value: formatHours(s.averageTimeToAcknowledgeHours), icon: Hourglass },
    { label: 'Tempo médio até a solução', value: formatHours(s.averageTimeToResolveHours), icon: Timer },
    { label: 'Reincidências', value: s.recurrences, icon: Repeat },
    {
      label: 'Última ocorrência',
      value: s.lastOccurrenceAt ? formatDateShort(toLocalISODate(new Date(s.lastOccurrenceAt))) : '—',
      icon: CalendarClock,
    },
  ];
});

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const countsLine = computed(() => {
  const s = props.report?.summary;
  if (!s) return '';
  return [
    plural(s.reportCount, 'reporte', 'reportes'),
    plural(s.openCount, 'em aberto', 'em aberto'),
    plural(s.resolvedCount, 'resolvido', 'resolvidos'),
    plural(s.dismissedCount, 'descartado', 'descartados'),
    `deu defeito ${plural(s.breakdownCount, 'vez', 'vezes')}`,
    `voltou a funcionar ${plural(s.repairCount, 'vez', 'vezes')}`,
  ].join(' · ');
});

const chartLabels = computed(() => props.report?.series.map((p) => p.label) ?? []);
const chartDatasets = computed(() => {
  void isDark.value;
  const c = chartColors();
  const series = props.report?.series ?? [];
  return [
    { label: 'Reportes', data: series.map((p) => p.reports), backgroundColor: c.chart1, borderColor: c.chart1 },
    { label: 'Dias com defeito', data: series.map((p) => p.brokenDays), backgroundColor: c.chart4, borderColor: c.chart4 },
  ];
});
</script>

<template>
  <!-- Plain section, not a card: its children are cards (no card-in-card). -->
  <section class="border-border flex flex-col gap-4 border-t pt-6" aria-labelledby="equipment-detail-title">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-muted-foreground m-0 text-[0.7rem] font-bold tracking-[0.06em] uppercase">Equipamento</p>
        <template v-if="report">
          <h2 id="equipment-detail-title" class="text-foreground m-0 text-[1.2rem] font-bold">{{ report.equipment.name }}</h2>
          <p class="text-muted-foreground m-0 text-[0.85rem]">
            {{ report.equipment.assetId }}<template v-if="location"> · {{ location }}</template>
            · {{ EQUIPMENT_STATUS_LABELS[report.equipment.status] ?? report.equipment.status }}
          </p>
        </template>
        <Skeleton v-else-if="loading" class="mt-1 h-6 w-48 rounded" />
        <h2 v-else id="equipment-detail-title" class="text-foreground m-0 text-[1.2rem] font-bold">Detalhes</h2>
      </div>
      <Button variant="ghost" size="icon" aria-label="Fechar detalhes" @click="emit('close')"><X :size="20" /></Button>
    </div>

    <div v-if="loading" class="flex flex-col gap-4" role="status" aria-label="Carregando detalhes do equipamento">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Skeleton v-for="n in 5" :key="n" class="h-[74px] rounded-[12px]" />
      </div>
      <ChartCardSkeleton title-width="w-44" />
    </div>

    <p v-else-if="error" class="text-destructive m-0 py-6 text-center text-[0.95rem]">{{ error }}</p>

    <template v-else-if="report">
      <MaintenanceSummary :items="cards" />
      <p class="text-muted-foreground m-0 text-[0.8rem]">{{ countsLine }}</p>
      <BarChart title="Reportes e dias com defeito" :labels="chartLabels" :datasets="chartDatasets" />
      <div class="bg-card border-border rounded-[12px] border p-5">
        <h3 class="text-foreground m-0 mb-3 text-base font-semibold">Linha do tempo</h3>
        <MaintenanceTimeline :events="report.timeline" />
      </div>
    </template>
  </section>
</template>
