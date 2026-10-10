<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  EQUIPMENT_STATUS_LABELS,
  SEVERITY_SHORT_LABELS,
  type EquipmentStatus,
  type MaintenanceEquipmentRow,
  type ReportSeverity,
} from '@/types/maintenance-history';
import { formatDays, sortMaintenanceRows, type MaintenanceSortKey } from '@/utils/maintenance-history';
import { formatDateTime } from '@/utils/date';
import { roomLabel, blockLabel } from '@/utils/space-labels';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import StatusBadge, { type StatusBadgeVariant } from '@/components/StatusBadge.vue';

const props = defineProps<{
  rows: MaintenanceEquipmentRow[];
  selectedId: string | null;
}>();
const emit = defineEmits<{ select: [id: string] }>();

const sortBy = ref<MaintenanceSortKey>('criticality');
const sortedRows = computed(() => sortMaintenanceRows(props.rows, sortBy.value));

const STATUS_VARIANT: Record<EquipmentStatus, StatusBadgeVariant> = {
  working: 'success',
  broken: 'danger',
  under_repair: 'warning',
  replacement_scheduled: 'warning',
};

const SEVERITY_VARIANT: Record<ReportSeverity, StatusBadgeVariant> = {
  minor: 'warning',
  major: 'danger',
  blocking: 'destructive',
};

function locationLabel(row: MaintenanceEquipmentRow): string {
  if (!row.space) return '—';
  return [roomLabel(row.space), blockLabel(row.space.block)].filter(Boolean).join(' · ');
}
</script>

<template>
  <div class="bg-card border-border rounded-[12px] border p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h3 class="text-foreground m-0 text-base font-semibold">Equipamentos no período</h3>
      <label class="inline-flex items-center gap-2">
        <span class="text-muted-foreground text-xs whitespace-nowrap">Ordenar por</span>
        <NativeSelect v-model="sortBy" class="h-9 min-w-[170px] text-[0.8rem]" aria-label="Ordenar equipamentos por">
          <NativeSelectOption value="criticality">Criticidade</NativeSelectOption>
          <NativeSelectOption value="brokenTime">Mais tempo com defeito</NativeSelectOption>
          <NativeSelectOption value="reports">Mais reportes</NativeSelectOption>
          <NativeSelectOption value="lastReport">Reporte mais recente</NativeSelectOption>
        </NativeSelect>
      </label>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-[0.85rem]">
        <thead>
          <tr class="text-muted-foreground border-border border-b-2 text-left text-[0.7rem] font-bold tracking-[0.06em] uppercase">
            <th class="px-3 py-2.5">Equipamento</th>
            <th class="px-3 py-2.5">Local</th>
            <th class="px-3 py-2.5">Situação</th>
            <th class="px-3 py-2.5">Reportes</th>
            <th class="px-3 py-2.5">Último reporte</th>
            <th class="px-3 py-2.5">Com defeito</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedRows"
            :key="row.id"
            class="border-border hover:bg-accent focus-visible:bg-accent cursor-pointer border-b transition-colors outline-none"
            :class="{ 'bg-accent': row.id === selectedId }"
            tabindex="0"
            :aria-selected="row.id === selectedId"
            @click="emit('select', row.id)"
            @keydown.enter.prevent="emit('select', row.id)"
            @keydown.space.prevent="emit('select', row.id)"
          >
            <td class="px-3 py-2.5">
              <div class="text-foreground font-medium">{{ row.name }}</div>
              <div class="text-muted-foreground text-[0.72rem]">
                {{ row.assetId }}
                <StatusBadge v-if="row.isRecurrent" variant="violet" class="ml-1">Reincidente</StatusBadge>
              </div>
            </td>
            <td class="text-foreground px-3 py-2.5">{{ locationLabel(row) }}</td>
            <td class="px-3 py-2.5">
              <StatusBadge :variant="STATUS_VARIANT[row.status] ?? 'muted'">
                {{ EQUIPMENT_STATUS_LABELS[row.status] ?? row.status }}
              </StatusBadge>
            </td>
            <td class="text-foreground px-3 py-2.5">
              {{ row.reportCount }}
              <span v-if="row.openCount > 0" class="text-muted-foreground text-[0.72rem]">({{ row.openCount }} em aberto)</span>
            </td>
            <td class="px-3 py-2.5">
              <template v-if="row.lastReportAt">
                <div class="text-foreground">{{ formatDateTime(row.lastReportAt) }}</div>
                <StatusBadge v-if="row.lastSeverity" :variant="SEVERITY_VARIANT[row.lastSeverity]">
                  {{ SEVERITY_SHORT_LABELS[row.lastSeverity] }}
                </StatusBadge>
              </template>
              <span v-else class="text-muted-foreground">—</span>
            </td>
            <td class="text-foreground px-3 py-2.5 whitespace-nowrap">{{ formatDays(row.timeInBrokenDays) }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="text-muted-foreground px-3 py-8 text-center">
              Nenhum equipamento com ocorrências no período.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
