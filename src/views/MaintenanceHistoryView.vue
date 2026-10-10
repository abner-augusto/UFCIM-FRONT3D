<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { ClipboardList, Repeat, TriangleAlert, Wrench } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type {
  EquipmentMaintenanceReport,
  MaintenanceHistory,
  MaintenanceHistoryFilters as Filters,
} from '@/types/maintenance-history';
import { formatDays, MAX_MAINTENANCE_RANGE_DAYS } from '@/utils/maintenance-history';
import { addLocalDays, formatDateLong, toLocalISODate } from '@/utils/date';
import { useDarkMode } from '@/composables/useDarkMode';
import { chartColors } from '@/lib/chartColors';
import MaintenanceHistoryFilters from '@/components/reports/MaintenanceHistoryFilters.vue';
import MaintenanceSummary from '@/components/reports/MaintenanceSummary.vue';
import MaintenanceEquipmentTable from '@/components/reports/MaintenanceEquipmentTable.vue';
import EquipmentMaintenanceDetail from '@/components/reports/EquipmentMaintenanceDetail.vue';
import BarChart from '@/components/reports/BarChart.vue';
import ChartCardSkeleton from '@/components/ChartCardSkeleton.vue';
import { Skeleton } from '@/components/ui/skeleton';

// MEL-013: maintenance history per equipment (staff and maintenance only;
// the route guard and the backend both enforce it).
const auth = useAuthStore();
const { isDark } = useDarkMode();

const today = toLocalISODate();
const initialFilters: Filters = {
  from: addLocalDays(today, -(MAX_MAINTENANCE_RANGE_DAYS - 1)),
  to: today,
  spaceId: '',
  departmentId: '',
  status: '',
  severity: '',
};

const filters = ref<Filters>({ ...initialFilters });
const history = ref<MaintenanceHistory | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const selectedId = ref<string | null>(null);
const detail = ref<EquipmentMaintenanceReport | null>(null);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const detailEl = ref<HTMLElement | null>(null);
let detailRequest = 0;

const historySinceLabel = computed(() => {
  const since = history.value?.historySince;
  if (!since) return 'As mudanças de situação passam a ser registradas a partir da primeira alteração.';
  return `Mudanças de situação registradas desde ${formatDateLong(toLocalISODate(new Date(since)))}. Antes disso, só os reportes entram no histórico.`;
});

const summaryCards = computed(() => {
  const s = history.value?.summary;
  if (!s) return [];
  return [
    { label: 'Reportes no período', value: s.reportCount, icon: ClipboardList },
    { label: 'Chamados em aberto', value: s.openCount, icon: TriangleAlert },
    { label: 'Tempo total com defeito', value: formatDays(s.timeInBrokenDays), icon: Wrench },
    { label: 'Equipamentos reincidentes', value: s.recurrentCount, icon: Repeat },
  ];
});

const chartLabels = computed(() => history.value?.series.map((p) => p.label) ?? []);
const chartTitle = computed(() =>
  (history.value?.range.days ?? 0) > 31 ? 'Reportes e dias com defeito por semana' : 'Reportes e dias com defeito por dia',
);
const chartDatasets = computed(() => {
  void isDark.value;
  const c = chartColors();
  const series = history.value?.series ?? [];
  return [
    { label: 'Reportes', data: series.map((p) => p.reports), backgroundColor: c.chart1, borderColor: c.chart1 },
    { label: 'Dias com defeito', data: series.map((p) => p.brokenDays), backgroundColor: c.chart4, borderColor: c.chart4 },
  ];
});

function queryParams(f: Filters) {
  return {
    from: f.from,
    to: f.to,
    spaceId: f.spaceId || undefined,
    departmentId: f.departmentId || undefined,
    status: f.status || undefined,
    severity: f.severity || undefined,
  };
}

async function loadHistory(f: Filters) {
  loading.value = true;
  errorMsg.value = null;
  filters.value = f;
  try {
    history.value = await api.getMaintenanceHistory(auth.token, queryParams(f));
    // Keep the open detail only while its equipment is still listed.
    if (selectedId.value && history.value.equipment.some((e) => e.id === selectedId.value)) {
      await loadDetail(selectedId.value, false);
    } else {
      closeDetail();
    }
  } catch {
    errorMsg.value = 'Não foi possível carregar o histórico de manutenção.';
  } finally {
    loading.value = false;
  }
}

async function loadDetail(id: string, scroll = true) {
  const request = ++detailRequest;
  selectedId.value = id;
  detailLoading.value = true;
  detailError.value = null;
  if (scroll) {
    await nextTick();
    detailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  try {
    const report = await api.getEquipmentMaintenanceReport(auth.token, id, {
      from: filters.value.from,
      to: filters.value.to,
    });
    if (request === detailRequest) detail.value = report;
  } catch {
    if (request === detailRequest) detailError.value = 'Não foi possível carregar os detalhes deste equipamento.';
  } finally {
    if (request === detailRequest) detailLoading.value = false;
  }
}

function closeDetail() {
  detailRequest++;
  selectedId.value = null;
  detail.value = null;
  detailError.value = null;
  detailLoading.value = false;
}

onMounted(() => loadHistory(initialFilters));
</script>

<template>
  <div class="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-6">
    <div>
      <h1 class="text-foreground m-0 text-xl font-semibold">Histórico de Manutenção</h1>
      <p class="text-muted-foreground m-0 mt-1 text-[0.85rem]">
        Reportes e mudanças de situação de cada equipamento, em até {{ MAX_MAINTENANCE_RANGE_DAYS }} dias.
      </p>
    </div>

    <MaintenanceHistoryFilters :initial="initialFilters" @apply="loadHistory" />

    <div v-if="loading" class="flex flex-col gap-4" role="status" aria-label="Carregando histórico">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-[74px] rounded-[12px]" />
      </div>
      <ChartCardSkeleton title-width="w-56" />
      <ChartCardSkeleton title-width="w-40" height-class="h-[240px]" />
    </div>

    <div v-else-if="errorMsg" class="text-destructive p-8 text-center text-[0.95rem]">{{ errorMsg }}</div>

    <template v-else-if="history">
      <p class="text-muted-foreground m-0 -mt-2 text-[0.8rem]">{{ historySinceLabel }}</p>

      <MaintenanceSummary :items="summaryCards" />

      <BarChart :title="chartTitle" :labels="chartLabels" :datasets="chartDatasets" />

      <MaintenanceEquipmentTable
        :rows="history.equipment"
        :selected-id="selectedId"
        @select="(id) => loadDetail(id)"
      />

      <div v-if="selectedId" ref="detailEl" class="scroll-mt-20">
        <EquipmentMaintenanceDetail
          :report="detail"
          :loading="detailLoading"
          :error="detailError"
          @close="closeDetail"
        />
      </div>
    </template>
  </div>
</template>
