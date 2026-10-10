<script setup lang="ts">
import { computed } from 'vue';
import {
  HISTORY_SOURCE_LABELS,
  SEVERITY_SHORT_LABELS,
  type MaintenanceTimelineEvent,
} from '@/types/maintenance-history';
import { formatDateTime } from '@/utils/date';

// Unified feed of ticket steps and status changes (MEL-013), newest first.
const props = defineProps<{ events: MaintenanceTimelineEvent[] }>();

/** Dot color: tickets follow their lifecycle step, status changes the status entered. */
const DOT_CLASS: Record<string, string> = {
  pending: 'bg-[var(--warning)]',
  acknowledged: 'bg-[var(--info)]',
  resolved: 'bg-[var(--success)]',
  dismissed: 'bg-[var(--muted-foreground)]',
  working: 'bg-[var(--success)]',
  broken: 'bg-[var(--danger-fg)]',
  under_repair: 'bg-[var(--warning)]',
  replacement_scheduled: 'bg-[var(--warning)]',
};

const groups = computed(() => {
  const result: Array<{ label: string; events: MaintenanceTimelineEvent[] }> = [];
  for (const event of props.events) {
    const label = new Date(event.at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const last = result[result.length - 1];
    if (last && last.label === label) last.events.push(event);
    else result.push({ label, events: [event] });
  }
  return result;
});

function meta(event: MaintenanceTimelineEvent): string {
  const parts: string[] = [];
  if (event.type === 'status' && event.source) parts.push(HISTORY_SOURCE_LABELS[event.source]);
  if (event.type === 'report' && event.severity && event.status === 'pending') {
    parts.push(`Gravidade ${SEVERITY_SHORT_LABELS[event.severity].toLowerCase()}`);
  }
  if (event.author) parts.push(`por ${event.author}`);
  return parts.join(' · ');
}
</script>

<template>
  <div>
    <div v-for="group in groups" :key="group.label" class="mb-5 last:mb-0">
      <h4 class="text-foreground border-border m-0 mb-2 border-b pb-1.5 text-[0.85rem] font-bold first-letter:uppercase">
        {{ group.label }}
      </h4>
      <ol class="m-0 flex list-none flex-col gap-1 p-0">
        <li v-for="event in group.events" :key="event.id" class="flex gap-2.5 rounded-lg px-2.5 py-2">
          <span
            class="mt-1.5 size-2.5 shrink-0 rounded-full"
            :class="DOT_CLASS[event.status ?? ''] ?? 'bg-[var(--primary)]'"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <div class="text-muted-foreground text-[0.72rem] font-medium">{{ formatDateTime(event.at) }}</div>
            <div class="text-foreground text-[0.88rem] font-semibold">{{ event.label }}</div>
            <div v-if="event.description" class="text-muted-foreground text-[0.78rem]">{{ event.description }}</div>
            <div v-if="meta(event)" class="text-muted-foreground text-[0.72rem]">{{ meta(event) }}</div>
          </div>
        </li>
      </ol>
    </div>
    <p v-if="events.length === 0" class="text-muted-foreground py-6 text-center text-[0.9rem]">
      Nenhum reporte ou mudança de situação no período.
    </p>
  </div>
</template>
