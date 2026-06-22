<script setup lang="ts">
import { computed } from 'vue';
import { PURPOSE_LABELS } from '@/types/reservation';
import { STATUS_LABELS } from '@/types/reservation';
import { Repeat, Ban } from 'lucide-vue-next';

interface ReservationItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  purpose: string | null;
  description: string | null;
  isRecurring: boolean;
  author: { displayName: string; role: string };
}

interface BlockingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  blockType: string;
  reason: string | null;
  author: { displayName: string; role: string };
}

const props = defineProps<{
  reservations: ReservationItem[];
  blockings: BlockingItem[];
}>();

interface TimelineEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'reservation' | 'blocking';
  title: string;
  subtitle: string;
  authorLabel: string;
  isRecurring: boolean;
  status: string;
  colorClass: string;
}

const entries = computed<TimelineEntry[]>(() => {
  const result: TimelineEntry[] = [];

  for (const r of props.reservations) {
    result.push({
      id: r.id,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      type: 'reservation',
      title: r.purpose ? (PURPOSE_LABELS[r.purpose] ?? r.purpose) : 'Reserva',
      subtitle: r.description ?? '',
      authorLabel: r.author.displayName,
      isRecurring: r.isRecurring,
      status: r.status,
      colorClass: r.status === 'canceled' ? 'entry--canceled' : 'entry--reservation',
    });
  }

  for (const b of props.blockings) {
    result.push({
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      type: 'blocking',
      title: b.blockType,
      subtitle: b.reason ?? '',
      authorLabel: b.author.displayName,
      isRecurring: false,
      status: 'blocked',
      colorClass: 'entry--blocking',
    });
  }

  // Sort by date asc, then startTime asc
  result.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.startTime.localeCompare(b.startTime);
  });

  return result;
});

// Group by month/year
interface MonthGroup {
  label: string;
  entries: TimelineEntry[];
}

const monthGroups = computed<MonthGroup[]>(() => {
  const groups: MonthGroup[] = [];
  let currentLabel = '';
  let current: TimelineEntry[] = [];

  for (const e of entries.value) {
    const d = new Date(e.date + 'T00:00:00');
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (label !== currentLabel) {
      if (current.length) {
        groups.push({ label: currentLabel, entries: current });
      }
      currentLabel = label;
      current = [];
    }
    current.push(e);
  }
  if (current.length) {
    groups.push({ label: currentLabel, entries: current });
  }

  return groups;
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', weekday: 'short' });
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s;
}
</script>

<template>
  <div class="timeline-container">
    <div v-if="monthGroups.length" class="timeline">
      <div v-for="group in monthGroups" :key="group.label" class="month-group">
        <h3 class="month-label">{{ group.label }}</h3>
        <ul class="entry-list">
          <li
            v-for="e in group.entries"
            :key="e.id"
            class="entry"
            :class="e.colorClass"
          >
            <div class="entry-dot" />
            <div class="entry-body">
              <div class="entry-head">
                <span class="entry-datetime">
                  {{ formatDate(e.date) }} · {{ e.startTime }}–{{ e.endTime }}
                </span>
                <span v-if="e.isRecurring" class="entry-badge entry-badge--recurring"><Repeat :size="10" style="vertical-align: -1px" /> Recorrente</span>
                <span v-if="e.type === 'blocking'" class="entry-badge entry-badge--blocking"><Ban :size="10" style="vertical-align: -1px" /> Bloqueio</span>
              </div>
              <div class="entry-title">{{ e.title }}</div>
              <div v-if="e.subtitle" class="entry-desc">{{ e.subtitle }}</div>
              <div class="entry-author">
                <template v-if="e.type === 'reservation' && e.status !== 'canceled'">
                  Reservado por <strong>{{ e.authorLabel }}</strong>
                </template>
                <template v-else-if="e.type === 'reservation' && e.status === 'canceled'">
                  Cancelado · <strong>{{ e.authorLabel }}</strong>
                </template>
                <template v-else>
                  Bloqueado por <strong>{{ e.authorLabel }}</strong>
                </template>
                <span v-if="e.type === 'reservation'" class="entry-status">· {{ statusLabel(e.status) }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <p v-else class="timeline-empty">Nenhuma reserva ou bloqueio no período.</p>
  </div>
</template>

<style scoped>
.timeline-container {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.month-group {
  margin-bottom: 1.5rem;
}

.month-group:last-child {
  margin-bottom: 0;
}

.month-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--foreground);
  text-transform: capitalize;
  margin: 0 0 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.entry {
  display: flex;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  transition: background 0.15s;
}

.entry:hover {
  background: var(--accent);
}

.entry--canceled {
  opacity: 0.5;
}

.entry-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}

.entry--reservation .entry-dot {
  background: var(--primary);
}

.entry--canceled .entry-dot {
  background: var(--avail-disabled);
}

.entry--blocking .entry-dot {
  background: var(--avail-reserved);
}

.entry-body {
  flex: 1;
  min-width: 0;
}

.entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.15rem;
}

.entry-datetime {
  font-size: 0.7rem;
  color: var(--muted-foreground);
  font-weight: 500;
}

.entry-badge {
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
}

.entry-badge--recurring {
  background: var(--info-surface);
  color: var(--info);
}

.entry-badge--blocking {
  background: var(--danger-surface);
  color: var(--danger-fg);
}

.entry-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.05rem;
}

.entry-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-bottom: 0.05rem;
}

.entry-author {
  font-size: 0.72rem;
  color: var(--muted-foreground);
}

.entry-status {
  font-size: 0.65rem;
  color: var(--muted-foreground);
}

.timeline-empty {
  text-align: center;
  color: var(--muted-foreground);
  padding: 2rem 0;
}
</style>
