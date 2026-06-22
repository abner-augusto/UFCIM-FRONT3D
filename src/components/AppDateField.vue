<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { CalendarDate, parseDate, getLocalTimeZone } from '@internationalized/date';
import type { DateValue } from 'reka-ui';
import { CalendarIcon } from '@lucide/vue';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Responsive date field (hybrid per MEL-009 Phase 3):
 * - desktop (md+): Reka Calendar inside a Popover
 * - mobile: native <input type="date"> (OS picker)
 *
 * Callers keep working with plain ISO "YYYY-MM-DD" strings.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string;
    min?: string;
    max?: string;
    disabled?: boolean;
    id?: string;
    ariaLabel?: string;
    class?: string;
  }>(),
  { modelValue: '' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const isDesktop = useMediaQuery('(min-width: 768px)');

function toDateValue(s?: string): CalendarDate | undefined {
  if (!s) return undefined;
  try {
    return parseDate(s);
  } catch {
    return undefined;
  }
}

const open = ref(false);

const calendarValue = computed<DateValue | undefined>({
  get: () => toDateValue(props.modelValue),
  set: (v) => emit('update:modelValue', v ? v.toString() : ''),
});

const minValue = computed(() => toDateValue(props.min));
const maxValue = computed(() => toDateValue(props.max));

const triggerLabel = computed(() => {
  const d = toDateValue(props.modelValue);
  if (!d) return 'Selecionar data';
  return d.toDate(getLocalTimeZone()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
});

function onNativeInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <Popover v-if="isDesktop" v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :id="id"
        type="button"
        variant="outline"
        :disabled="disabled"
        :aria-label="ariaLabel"
        :class="cn('h-11 w-full justify-start gap-2 font-normal', !modelValue && 'text-muted-foreground', props.class)"
      >
        <CalendarIcon class="size-4 opacity-70" />
        {{ triggerLabel }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="calendarValue"
        :min-value="minValue"
        :max-value="maxValue"
        locale="pt-BR"
        initial-focus
        @update:model-value="open = false"
      />
    </PopoverContent>
  </Popover>

  <input
    v-else
    :id="id"
    type="date"
    :value="modelValue"
    :min="min"
    :max="max"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :class="cn(
      'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50',
      props.class,
    )"
    @input="onNativeInput"
  />
</template>
