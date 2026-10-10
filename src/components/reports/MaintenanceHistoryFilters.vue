<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Space } from '@/types/space';
import {
  EQUIPMENT_STATUS_LABELS,
  SEVERITY_SHORT_LABELS,
  type MaintenanceHistoryFilters,
} from '@/types/maintenance-history';
import { MAX_MAINTENANCE_RANGE_DAYS, rangeDays } from '@/utils/maintenance-history';
import { roomLabel, blockLabel } from '@/utils/space-labels';
import AppDateField from '@/components/AppDateField.vue';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

// Same layout and behavior as ReportFilters, with the maintenance filters.
const props = defineProps<{ initial: MaintenanceHistoryFilters }>();
const emit = defineEmits<{ apply: [filters: MaintenanceHistoryFilters] }>();

const auth = useAuthStore();
const form = reactive<MaintenanceHistoryFilters>({ ...props.initial });

const departments = ref<{ id: string; name: string }[]>([]);
const spaces = ref<Space[]>([]);

// The spaces endpoint caps a page at 100 (same paging as useSpaceBrowser).
async function loadSpaces(): Promise<Space[]> {
  const first = await api.listSpaces(auth.token, { limit: '100' });
  if (first.length < 100) return first;
  return [...first, ...(await api.listSpaces(auth.token, { limit: '100', page: '2' }))];
}

onMounted(async () => {
  // Options are a convenience: the report still loads if they fail.
  const [deps, spaceList] = await Promise.allSettled([api.listDepartments(auth.token), loadSpaces()]);
  if (deps.status === 'fulfilled') departments.value = deps.value;
  if (spaceList.status === 'fulfilled') spaces.value = spaceList.value;
});

const spaceOptions = computed(() =>
  spaces.value
    .filter((s) => !form.departmentId || s.department === form.departmentId)
    .map((s) => ({
      id: s.id,
      label: [roomLabel(s), blockLabel(s.block)].filter(Boolean).join(' · '),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
);

const days = computed(() => rangeDays(form.from, form.to));
const rangeError = computed(() => {
  if (days.value === 0) return 'Escolha uma data inicial anterior à final.';
  if (days.value > MAX_MAINTENANCE_RANGE_DAYS) {
    return `O período pode ter no máximo ${MAX_MAINTENANCE_RANGE_DAYS} dias (atual: ${days.value}).`;
  }
  return null;
});

function onDepartmentChange() {
  // A room from another department would silently empty the report.
  if (form.spaceId && !spaceOptions.value.some((s) => s.id === form.spaceId)) form.spaceId = '';
}

function apply() {
  if (rangeError.value) return;
  emit('apply', { ...form });
}

const fieldClass = 'flex min-w-0 flex-col gap-1.5 *:data-[slot=native-select-wrapper]:w-full';
const labelClass = 'text-muted-foreground text-[0.7rem] font-bold tracking-[0.06em] uppercase';
</script>

<template>
  <form class="bg-card border-border rounded-[12px] border px-5 py-4" @submit.prevent="apply">
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div :class="fieldClass">
        <label for="mh-from" :class="labelClass">Data início</label>
        <AppDateField id="mh-from" v-model="form.from" :max="form.to" aria-label="Data início" />
      </div>

      <div :class="fieldClass">
        <label for="mh-to" :class="labelClass">Data fim</label>
        <AppDateField id="mh-to" v-model="form.to" :min="form.from" aria-label="Data fim" />
      </div>

      <div :class="fieldClass">
        <label for="mh-department" :class="labelClass">Departamento</label>
        <NativeSelect id="mh-department" v-model="form.departmentId" class="h-11" @change="onDepartmentChange">
          <NativeSelectOption value="">Todos</NativeSelectOption>
          <NativeSelectOption v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</NativeSelectOption>
        </NativeSelect>
      </div>

      <div :class="fieldClass">
        <label for="mh-space" :class="labelClass">Sala</label>
        <NativeSelect id="mh-space" v-model="form.spaceId" class="h-11">
          <NativeSelectOption value="">Todas</NativeSelectOption>
          <NativeSelectOption v-for="s in spaceOptions" :key="s.id" :value="s.id">{{ s.label }}</NativeSelectOption>
        </NativeSelect>
      </div>

      <div :class="fieldClass">
        <label for="mh-status" :class="labelClass">Situação atual</label>
        <NativeSelect id="mh-status" v-model="form.status" class="h-11">
          <NativeSelectOption value="">Todas</NativeSelectOption>
          <NativeSelectOption v-for="(label, value) in EQUIPMENT_STATUS_LABELS" :key="value" :value="value">
            {{ label }}
          </NativeSelectOption>
        </NativeSelect>
      </div>

      <div :class="fieldClass">
        <label for="mh-severity" :class="labelClass">Gravidade</label>
        <NativeSelect id="mh-severity" v-model="form.severity" class="h-11">
          <NativeSelectOption value="">Todas</NativeSelectOption>
          <NativeSelectOption v-for="(label, value) in SEVERITY_SHORT_LABELS" :key="value" :value="value">
            {{ label }}
          </NativeSelectOption>
        </NativeSelect>
      </div>

    </div>
    <div class="mt-3 flex flex-wrap items-center justify-end gap-3">
      <p v-if="rangeError" class="text-destructive m-0 mr-auto text-[0.8rem]" role="alert">{{ rangeError }}</p>
      <Button type="submit" class="h-11 px-6 font-semibold" :disabled="!!rangeError">Aplicar</Button>
    </div>
  </form>
</template>
