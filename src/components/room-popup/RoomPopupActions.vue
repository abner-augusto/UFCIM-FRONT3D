<script setup lang="ts">
import { computed } from 'vue';
import { BarChart3 } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import RoleLockedButton from '@/components/RoleLockedButton.vue';
import { useAuthStore } from '@/stores/auth';
import { roleDeniedReason } from '@/utils/permissions';

const props = defineProps<{
  canReserve: boolean;
  canBlock: boolean;
  canViewReports: boolean;
  reserveDisabled?: boolean;
  loadingReservationState?: boolean;
  reserveRangeBookable: boolean;
  /** The user picked hours in the strip (vs. the period's default range). */
  hasUserSelection?: boolean;
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

// MEL-008: CTAs the role cannot use stay visible, locked, with the reason.
const auth = useAuthStore();
const reserveLockedReason = computed(() => (props.canReserve ? null : roleDeniedReason('reserve', auth.userRole)));
const reportsLockedReason = computed(() => (props.canViewReports ? null : roleDeniedReason('reports', auth.userRole)));
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
    <RoleLockedButton v-else-if="reserveLockedReason" variant="outline" class="h-11 w-full" :reason="reserveLockedReason">
      Reservar
    </RoleLockedButton>
    <template v-if="canReserve">
      <p v-if="loadingReservationState" class="action-hint">Verificando disponibilidade...</p>
      <p v-else-if="reserveDisabledReason" class="action-hint action-hint--warn">{{ reserveDisabledReason }}</p>
      <p v-else-if="!reserveRangeBookable" class="action-hint action-hint--warn">
        {{ hasUserSelection ? 'A reserva precisa de pelo menos 1 hora livre seguida.' : 'Não resta 1 hora livre seguida neste turno.' }}
      </p>
    </template>
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
    <RoleLockedButton v-else-if="reportsLockedReason" variant="ghost" class="h-11 w-full" :reason="reportsLockedReason">
      Ver relatório
    </RoleLockedButton>
  </div>
</template>

<style scoped>
.room-popup__actions { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.action-hint { margin: 0; color: var(--muted-foreground); font-size: 0.78rem; text-align: center; }
.action-hint--warn { color: var(--warning); }
</style>
