<script setup lang="ts">
import { computed } from 'vue';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/** Weekdays as the backend numbers them (0 = Sunday), listed Monday first. */
const WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
] as const;

const props = withDefaults(defineProps<{
  modelValue: number[];
  /** Once reached, the unselected days lock until one is cleared. */
  max?: number;
  ariaLabelledby?: string;
}>(), { max: 3 });

const emit = defineEmits<{ 'update:modelValue': [days: number[]] }>();

// reka's multiple ToggleGroup works with strings; the form keeps numbers.
const selected = computed(() => props.modelValue.map(String));
const full = computed(() => props.modelValue.length >= props.max);

function update(value: unknown) {
  const days = (Array.isArray(value) ? value : []).map(Number).slice(0, props.max);
  emit('update:modelValue', days.sort((a, b) => a - b));
}
</script>

<template>
  <ToggleGroup
    type="multiple"
    variant="outline"
    :spacing="1"
    class="grid w-full grid-cols-7"
    :aria-labelledby="ariaLabelledby"
    :model-value="selected"
    @update:model-value="update"
  >
    <ToggleGroupItem
      v-for="day in WEEKDAYS"
      :key="day.value"
      :value="String(day.value)"
      :aria-label="day.label"
      :title="full && !modelValue.includes(day.value) ? `Máximo de ${max} dias` : day.label"
      :disabled="full && !modelValue.includes(day.value)"
      class="h-11 min-w-0 px-0 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
    >
      {{ day.short }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>
