<script setup lang="ts">
import type { AvailabilitySlot } from '@/types/reservation';
import { Repeat } from 'lucide-vue-next';

defineProps<{
  selectedSlot: AvailabilitySlot | null;
  purposeLabel: (purpose: string) => string;
  blockTypeLabel: (blockType: string) => string;
}>();

const emit = defineEmits<{
  goToReservation: [reservationId: string];
}>();
</script>

<template>
  <section v-if="selectedSlot && (selectedSlot.reservation || selectedSlot.blocking)" class="slot-detail" :class="selectedSlot.status === 'blocked' ? 'slot-detail--blocked' : 'slot-detail--reserved'">
    <div class="slot-detail-head">
      <span class="slot-time">{{ selectedSlot.startTime }} – {{ selectedSlot.endTime }}</span>
      <span v-if="selectedSlot.reservation?.isRecurring" class="slot-badge slot-badge--recurring"><Repeat :size="10" style="vertical-align: -1px" /> Recorrente</span>
      <span v-if="selectedSlot.reservation?.isSelf" class="slot-badge slot-badge--own">Sua reserva</span>
    </div>

    <template v-if="selectedSlot.reservation">
      <div class="slot-purpose">
        <strong>{{ purposeLabel(selectedSlot.reservation.purpose) }}</strong>
        <span v-if="selectedSlot.reservation.description"> · {{ selectedSlot.reservation.description }}</span>
      </div>
      <div class="slot-author">
        <template v-if="selectedSlot.reservation.isSelf">
          <a class="slot-link" @click="emit('goToReservation', selectedSlot.reservation!.id)">Gerenciar reserva →</a>
        </template>
        <template v-else>
          Reservada por <strong>{{ selectedSlot.reservation.author.displayName }}</strong>
        </template>
      </div>
    </template>

    <template v-else-if="selectedSlot.blocking">
      <div class="slot-purpose">
        <strong>{{ blockTypeLabel(selectedSlot.blocking.blockType) }}</strong>
        <span v-if="selectedSlot.blocking.reason"> · {{ selectedSlot.blocking.reason }}</span>
      </div>
      <div class="slot-author">
        Bloqueado por {{ selectedSlot.blocking.author.displayName }}
      </div>
    </template>
  </section>
</template>

<style scoped>
.slot-detail { padding: 8px 10px; border-radius: 8px; margin-top: 6px; margin-bottom: 6px; font-size: 0.78rem; }
.slot-detail--reserved { background: var(--danger-surface); border: 1px solid var(--danger-border); }
.slot-detail--blocked { background: var(--warning-surface); border: 1px solid var(--warning-border); }
.slot-detail-head { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.slot-time { font-weight: 600; color: var(--foreground); }
.slot-badge { font-size: 0.62rem; padding: 1px 6px; border-radius: 999px; font-weight: 600; }
.slot-badge--recurring { background: var(--info-surface); color: var(--info); }
.slot-badge--own { background: var(--success-surface); color: var(--success); }
.slot-purpose { margin-bottom: 2px; color: var(--foreground); }
.slot-author { color: var(--muted-foreground); }
.slot-link { color: var(--color-link); cursor: pointer; }
</style>
