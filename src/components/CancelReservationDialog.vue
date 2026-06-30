<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import StatefulActionButton, { type ActionStatus } from '@/components/StatefulActionButton.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

export type CancelReservationStatus = ActionStatus;

export interface CancelReservationSummary {
  spaceName: string;
  dateLabel: string;
  timeLabel: string;
}

const props = defineProps<{
  open: boolean;
  summary: CancelReservationSummary | null;
  futureOccurrencesCount?: number | null;
  status: CancelReservationStatus;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
  confirm: [];
  keep: [];
}>();

const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const mediaQuery = window.matchMedia('(min-width: 768px)');

const isLocked = computed(() => props.status === 'submitting' || props.status === 'success');
const statusMessage = computed(() => {
  if (props.status === 'submitting') return 'Enviando cancelamento...';
  if (props.status === 'success') return 'Reserva cancelada. Atualizando sua lista...';
  return '';
});

function handleMediaChange(event: MediaQueryListEvent | MediaQueryList) {
  isDesktop.value = event.matches;
}

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleMediaChange);
});

function handleOpenChange(open: boolean) {
  if (!open && isLocked.value) {
    emit('update:open', true);
    return;
  }
  emit('update:open', open);
  if (!open && !isLocked.value) emit('keep');
}

function handleKeep() {
  if (isLocked.value) return;
  emit('update:open', false);
  emit('keep');
}

function handleConfirm() {
  if (isLocked.value) return;
  emit('confirm');
}
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="cancel-dialog z-[var(--z-modal)]"
      :class="isDesktop ? '' : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      :show-close-button="!isLocked"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <div class="cancel-dialog__body">
        <component :is="isDesktop ? DialogTitle : DrawerTitle" class="cancel-dialog__title">
          Cancelar reserva
        </component>
        <component :is="isDesktop ? DialogDescription : DrawerDescription" class="cancel-dialog__description">
          Esta ação cancelará a reserva selecionada.
        </component>

        <dl v-if="summary" class="cancel-dialog__summary">
          <div class="cancel-dialog__summary-row">
            <dt>Espaço</dt>
            <dd>{{ summary.spaceName }}</dd>
          </div>
          <div class="cancel-dialog__summary-row">
            <dt>Data</dt>
            <dd>{{ summary.dateLabel }}</dd>
          </div>
          <div class="cancel-dialog__summary-row">
            <dt>Horário</dt>
            <dd>{{ summary.timeLabel }}</dd>
          </div>
        </dl>

        <p v-if="futureOccurrencesCount != null" class="cancel-dialog__series-warning">
          Serão canceladas {{ futureOccurrencesCount }} ocorrências futuras desta série.
        </p>

        <p
          v-if="statusMessage"
          class="cancel-dialog__status"
          :class="`cancel-dialog__status--${status}`"
          role="status"
          aria-live="polite"
        >
          {{ statusMessage }}
        </p>

        <p v-if="status === 'error' && errorMessage" class="cancel-dialog__error" role="alert">
          {{ errorMessage }}
        </p>

        <div class="cancel-dialog__actions">
          <Button
            type="button"
            variant="outline"
            class="cancel-dialog__button"
            :disabled="isLocked"
            @click="handleKeep"
          >
            Manter reserva
          </Button>
          <StatefulActionButton
            class="cancel-dialog__button"
            :status="status"
            idle-label="Cancelar reserva"
            submitting-label="Cancelando..."
            success-label="Reserva cancelada"
            error-label="Tentar novamente"
            @click="handleConfirm"
          />
        </div>
      </div>
    </component>
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer root, which does not receive this component's scoped attr. -->
<style>
.cancel-dialog[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.cancel-dialog {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.cancel-dialog[data-state="open"] {
  animation: cancel-dialog-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}

.cancel-dialog[data-state="closed"] {
  animation: cancel-dialog-out 0.18s ease-in both;
}

.cancel-dialog::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.cancel-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cancel-dialog__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.cancel-dialog__description {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  margin: -0.75rem 0 0;
}

.cancel-dialog__summary {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
}

.cancel-dialog__summary-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.cancel-dialog__summary-row dt {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.cancel-dialog__summary-row dd {
  margin: 0;
  color: var(--foreground);
  font-weight: 500;
  text-align: right;
}

.cancel-dialog__series-warning {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--danger-border);
  border-radius: 12px;
  background: var(--danger-surface);
  color: var(--danger-fg);
  font-size: 0.85rem;
}

.cancel-dialog__status,
.cancel-dialog__error {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.cancel-dialog__status {
  border: 1px solid var(--info-border, var(--border));
  background: var(--info-surface);
  color: var(--info);
}

.cancel-dialog__status--success {
  border-color: var(--success-border, var(--border));
  background: var(--success-surface);
  color: var(--success);
}

.cancel-dialog__error {
  border: 1px solid var(--danger-border);
  background: var(--danger-surface);
  color: var(--danger-fg);
}

.cancel-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.cancel-dialog__button {
  min-width: 9rem;
}

.cancel-dialog__actions :deep(.stateful-action-button) {
  width: auto;
}

.cancel-dialog__actions :deep(.stateful-action-button[data-state='idle']) {
  --action-button-bg: var(--destructive);
  --action-button-fg: var(--destructive-foreground);
}

@media (max-width: 480px) {
  .cancel-dialog {
    max-width: none;
    padding: 0 1.5rem 1.5rem;
    padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
  }

  .cancel-dialog__actions {
    flex-direction: column-reverse;
  }

  .cancel-dialog__button {
    width: 100%;
  }

  .cancel-dialog__actions :deep(.stateful-action-button) {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cancel-dialog[data-state="open"],
  .cancel-dialog[data-state="closed"] {
    animation: none !important;
  }
}

@keyframes cancel-dialog-in {
  from { opacity: 0; transform: translate(-50%, 28px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

@keyframes cancel-dialog-out {
  from { opacity: 1; transform: translate(-50%, 0) scale(1); }
  to { opacity: 0; transform: translate(-50%, 12px) scale(0.97); }
}
</style>
