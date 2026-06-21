<script setup lang="ts">
import type { PeriodKey } from '@/utils/period';
import AppDateField from '@/components/AppDateField.vue';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';

defineProps<{
  modelValue: PeriodKey;
  selectedDate: string;
  today: string;
  loading: boolean;
  autoDetected: boolean;
}>();

defineEmits<{
  'update:modelValue': [period: PeriodKey];
  'update:selectedDate': [date: string];
}>();
</script>

<template>
  <!-- Positioned by the parent .viewer-topleft stack in ViewerView (desktop only). -->
  <div
    class="bg-background/90 min-w-[170px] rounded-[10px] px-3.5 py-2.5 backdrop-blur-sm"
  >
    <Label class="text-muted-foreground mb-1.5 block text-[0.72rem] font-semibold tracking-wide uppercase" for="period-date">
      Data
    </Label>
    <AppDateField
      id="period-date"
      class="mb-2"
      :model-value="selectedDate"
      min="2024-01-01"
      aria-label="Selecionar data"
      @update:model-value="$emit('update:selectedDate', $event)"
    />

    <Label class="text-muted-foreground mb-1.5 block text-[0.72rem] font-semibold tracking-wide uppercase" for="period-turno">
      Turno
      <span
        v-if="autoDetected"
        class="bg-secondary text-secondary-foreground ml-1 inline-block rounded px-1.5 py-px align-middle text-[0.65rem] font-medium max-[480px]:hidden"
      >automático</span>
    </Label>
    <NativeSelect
      id="period-turno"
      class="w-full"
      :model-value="modelValue"
      :disabled="loading"
      @update:model-value="$emit('update:modelValue', String($event) as PeriodKey)"
    >
      <NativeSelectOption value="morning">Manhã (07h–12h)</NativeSelectOption>
      <NativeSelectOption value="afternoon">Tarde (13h–18h)</NativeSelectOption>
      <NativeSelectOption value="evening">Noite (19h–22h)</NativeSelectOption>
    </NativeSelect>
    <span v-if="loading" class="text-primary mt-1 block text-[0.72rem]">Atualizando...</span>

    <div class="mt-2 flex gap-3 max-[480px]:hidden">
      <span class="flex items-center gap-[3px] text-[0.72rem] text-[#555]">
        <span class="size-2 shrink-0 rounded-full bg-[#00b050]"></span>
        Disponível
      </span>
      <span class="flex items-center gap-[3px] text-[0.72rem] text-[#555]">
        <span class="size-2 shrink-0 rounded-full bg-[#f2c200]"></span>
        Parcial
      </span>
      <span class="flex items-center gap-[3px] text-[0.72rem] text-[#555]">
        <span class="size-2 shrink-0 rounded-full bg-[#d32f2f]"></span>
        Ocupado
      </span>
    </div>
  </div>
</template>
