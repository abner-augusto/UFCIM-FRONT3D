<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUpRight } from '@lucide/vue';
import type { ActionHistoryItem } from '@/types/action-history';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDateTime } from '@/utils/date';
import {
  actionTypeMeta,
  formatActionSpace,
  formatActionTargetSchedule,
  reservationLinkForAction,
} from '@/utils/action-history';

const props = defineProps<{
  entry: ActionHistoryItem;
}>();

const meta = computed(() => actionTypeMeta(props.entry.actionType));
const actorName = computed(() => props.entry.actor?.name?.trim() || 'Usuário desconhecido');
const spaceLabel = computed(() => formatActionSpace(props.entry.space));
const targetSchedule = computed(() => formatActionTargetSchedule(props.entry));
const reservationLink = computed(() => reservationLinkForAction(props.entry));
</script>

<template>
  <li class="action-card" data-testid="action-history-card">
    <div class="action-card__header">
      <div class="action-card__who">
        <span class="action-card__actor" data-testid="action-history-actor">{{ actorName }}</span>
        <span class="action-card__when" data-testid="action-history-timestamp">
          {{ formatDateTime(entry.timestamp) }}
        </span>
      </div>
      <StatusBadge :variant="meta.variant" data-testid="action-history-action">
        {{ meta.label }}
      </StatusBadge>
    </div>

    <div class="action-card__meta">
      <p class="action-card__space" data-testid="action-history-space">
        <span class="meta-label">Espaço:</span> {{ spaceLabel }}
      </p>
      <p v-if="targetSchedule" class="action-card__schedule" data-testid="action-history-schedule">
        <span class="meta-label">{{ entry.referenceType === 'blocking' ? 'Bloqueio:' : 'Reserva:' }}</span>
        {{ targetSchedule }}
      </p>
      <p v-if="entry.details" class="action-card__details" data-testid="action-history-details">
        {{ entry.details }}
      </p>
    </div>

    <div v-if="reservationLink" class="action-card__footer">
      <router-link
        :to="reservationLink"
        class="action-card__link"
        data-testid="action-history-reservation-link"
      >
        Ver reserva
        <ArrowUpRight class="size-3.5" aria-hidden="true" />
      </router-link>
    </div>
  </li>
</template>

<style scoped>
.action-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.action-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}
.action-card__who {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.action-card__actor {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--foreground);
  overflow-wrap: anywhere;
}
.action-card__when {
  font-size: 0.8rem;
  color: var(--muted-foreground);
}
.action-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.action-card__meta p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--foreground);
  overflow-wrap: anywhere;
}
.meta-label {
  color: var(--muted-foreground);
  font-weight: 500;
}
.action-card__details {
  color: var(--muted-foreground) !important;
  font-size: 0.82rem !important;
  margin-top: 0.15rem !important;
}
.action-card__footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border);
  padding-top: 0.55rem;
}
.action-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  min-height: 2.25rem;
  padding: 0 0.25rem;
}
.action-card__link:hover {
  text-decoration: underline;
}
</style>
