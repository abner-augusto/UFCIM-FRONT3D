<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES } from '@/types/reservation';
import type { TimeSlot } from '@/types/reservation';
import { toLocalISODate } from '@/utils/date';
import AppDateField from '@/components/AppDateField.vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const props = defineProps<{
  spaceId: string;
  reservable: boolean | undefined;
}>();

const router = useRouter();
const auth = useAuthStore();
const today = toLocalISODate();

const startDate = ref('');
const endDate = ref('');
const dayOfWeek = ref<number | null>(null);
const description = ref('');
const selectedPeriod = ref<TimeSlot | null>(null);
const loading = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);

const minEndDate = computed(() => {
  if (!startDate.value) return today;
  const d = new Date(startDate.value + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return toLocalISODate(d);
});

function canSubmit() {
  return (
    props.reservable !== false &&
    startDate.value &&
    endDate.value &&
    endDate.value > startDate.value &&
    dayOfWeek.value !== null &&
    selectedPeriod.value &&
    description.value.trim()
  );
}

async function handleSubmit() {
  if (!canSubmit()) return;
  const { startTime, endTime } = TIME_SLOT_RANGES[selectedPeriod.value!];
  loading.value = true;
  errorMsg.value = null;
  successMsg.value = null;
  try {
    const result = await api.createRecurringReservation(auth.token, {
      spaceId: props.spaceId,
      startDate: startDate.value,
      endDate: endDate.value,
      dayOfWeek: dayOfWeek.value!,
      startTime,
      endTime,
      description: description.value.trim() || undefined,
    });
    successMsg.value = `${result.created.length} reservas criadas, ${result.skipped.length} conflitos ignorados.`;
    setTimeout(() => router.push({ name: 'my-reservations' }), 2000);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível criar as reservas recorrentes.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-start">Data de início</Label>
      <AppDateField id="rec-start" v-model="startDate" :min="today" aria-label="Data de início" />
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-end">Data de fim</Label>
      <AppDateField id="rec-end" v-model="endDate" :min="minEndDate" aria-label="Data de fim" />
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-dow">Dia da semana</Label>
      <NativeSelect
        id="rec-dow"
        class="h-11 w-full"
        :model-value="dayOfWeek ?? ''"
        @update:model-value="dayOfWeek = $event === '' ? null : Number($event)"
      >
        <NativeSelectOption value="" disabled>Selecione um dia</NativeSelectOption>
        <NativeSelectOption value="1">Segunda-feira</NativeSelectOption>
        <NativeSelectOption value="2">Terça-feira</NativeSelectOption>
        <NativeSelectOption value="3">Quarta-feira</NativeSelectOption>
        <NativeSelectOption value="4">Quinta-feira</NativeSelectOption>
        <NativeSelectOption value="5">Sexta-feira</NativeSelectOption>
        <NativeSelectOption value="6">Sábado</NativeSelectOption>
        <NativeSelectOption value="0">Domingo</NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold">Período</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        orientation="vertical"
        :spacing="2"
        class="w-full"
        :model-value="selectedPeriod ?? ''"
        @update:model-value="selectedPeriod = ($event || null) as TimeSlot | null"
      >
        <ToggleGroupItem
          v-for="(label, slot) in TIME_SLOT_LABELS"
          :key="slot"
          :value="slot"
          class="h-11 w-full justify-start"
        >
          {{ label }} ({{ TIME_SLOT_RANGES[slot as TimeSlot].startTime }}–{{ TIME_SLOT_RANGES[slot as TimeSlot].endTime }})
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div class="mb-5">
      <Label class="mb-2 block text-sm font-semibold" for="rec-desc">Descrição da recorrência</Label>
      <Input
        id="rec-desc"
        v-model="description"
        class="h-11"
        type="text"
        placeholder="Ex: Aula de Algoritmos — Semestre 2026.1"
      />
    </div>

    <p v-if="successMsg" class="text-primary mb-3 text-sm font-medium" role="status" aria-live="polite">{{ successMsg }}</p>
    <p v-if="errorMsg" class="text-destructive mb-3 text-sm" role="alert" aria-live="polite">{{ errorMsg }}</p>

    <div class="form-actions">
      <Button
        class="h-11 w-full"
        :disabled="!canSubmit() || loading"
        @click="handleSubmit"
      >
        {{ loading ? 'Agendando...' : 'Agendar Reservas Recorrentes' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.form-actions {
  margin-top: 1rem;
}
@media (max-width: 767px) {
  .form-actions {
    position: sticky;
    bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px));
    background: var(--background);
    padding: 0.75rem 0 calc(0.5rem + var(--safe-bottom, 0px));
    z-index: 5;
    box-shadow: 0 -4px 12px rgb(var(--shadow-color) / 0.06);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
