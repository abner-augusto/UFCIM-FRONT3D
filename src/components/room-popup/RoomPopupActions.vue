<script setup lang="ts">
import { BarChart3 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

defineProps<{
  canReserve: boolean;
  canBlock: boolean;
  canViewReports: boolean;
  reserveDisabled?: boolean;
  loadingReservationState?: boolean;
  reserveRangeBookable: boolean;
  reserveStartTime: string;
  reserveEndTime: string;
  reserveDisabledReason?: string | null;
  blockingAllowed?: boolean;
}>();

const emit = defineEmits<{
  reserve: [];
  block: [];
  report: [];
}>();
</script>

<template>
  <div class="room-popup__actions">
    <Button
      v-if="canReserve"
      class="h-11 w-full"
      :disabled="reserveDisabled || loadingReservationState || !reserveRangeBookable"
      :aria-label="`Reservar das ${reserveStartTime} às ${reserveEndTime}`"
      @click="emit('reserve')"
    >
      Reservar {{ reserveStartTime }}–{{ reserveEndTime }}
    </Button>
    <p v-if="loadingReservationState" class="action-hint">Verificando disponibilidade...</p>
    <p v-else-if="reserveDisabledReason" class="action-hint action-hint--warn">{{ reserveDisabledReason }}</p>
    <p v-else-if="!reserveRangeBookable" class="action-hint action-hint--warn">Todos os horários deste turno já passaram.</p>
    <Button
      v-if="canBlock"
      variant="outline"
      class="h-11 w-full"
      :disabled="blockingAllowed === false"
      aria-label="Bloquear espaço"
      @click="emit('block')"
    >
      Bloquear Espaço
    </Button>
    <Button v-if="canViewReports" variant="ghost" class="h-11 w-full" aria-label="Ver relatório de ocupação" @click="emit('report')">
      <BarChart3 :size="14" style="vertical-align: -2px" /> Ver relatório
    </Button>
  </div>
</template>

<style scoped>
.room-popup__actions { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.action-hint { margin: 0; color: var(--muted-foreground); font-size: 0.78rem; text-align: center; }
.action-hint--warn { color: var(--warning); }
</style>
