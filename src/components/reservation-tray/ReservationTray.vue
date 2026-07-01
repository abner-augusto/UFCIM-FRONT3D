<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import ReservationScheduleStep from './ReservationScheduleStep.vue';
import ReservationPurposeStep from './ReservationPurposeStep.vue';
import ReservationConfirmStep from './ReservationConfirmStep.vue';
import ReservationSuccessStep from './ReservationSuccessStep.vue';
import { useInteractionStore } from '@/stores/interaction';
import { useAuthStore } from '@/stores/auth';
import { api, ApiError } from '@/services/api';
import type { ActionStatus } from '@/components/StatefulActionButton.vue';

export type ReservationTrayStep = 'schedule' | 'purpose' | 'confirm' | 'success';

interface ReservationScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

interface ReservationPurposeSelection {
  purpose: string;
  description: string;
}

const props = defineProps<{
  open: boolean;
  campusId: string;
  spaceId: string;
  spaceName: string;
  modelId?: string | null;
  // Optional pre-fill carried in from another surface (e.g. the maquete's
  // RoomPopup), so the schedule step opens on the same date/range the user
  // already picked. The schedule step self-corrects to null if the range is
  // no longer bookable.
  initialSchedule?: ReservationScheduleSelection | null;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
}>();

const steps: ReservationTrayStep[] = ['schedule', 'purpose', 'confirm', 'success'];
const interaction = useInteractionStore();
const auth = useAuthStore();
const router = useRouter();

const stepTitles: Record<ReservationTrayStep, string> = {
  schedule: 'Escolher horário',
  purpose: 'Informar finalidade',
  confirm: 'Confirmar reserva',
  success: 'Reserva concluída',
};

const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const mediaQuery = window.matchMedia('(min-width: 768px)');
const currentStep = ref<ReservationTrayStep>('schedule');
const selectedSchedule = ref<ReservationScheduleSelection | null>(null);
const selectedPurpose = ref<ReservationPurposeSelection>({ purpose: '', description: '' });
const reservationId = ref<string | null>(null);
const confirmStatus = ref<ActionStatus>('idle');
const confirmError = ref<string | null>(null);
let successStepTimer: ReturnType<typeof window.setTimeout> | null = null;

const currentStepIndex = computed(() => steps.indexOf(currentStep.value));
const currentTitle = computed(() => stepTitles[currentStep.value]);
const canGoBack = computed(() => currentStepIndex.value > 0 && currentStep.value !== 'success');
const scheduleIsValid = computed(() => !!selectedSchedule.value?.date && !!selectedSchedule.value?.startTime && !!selectedSchedule.value?.endTime);
const purposeIsValid = computed(() => !!selectedPurpose.value.purpose);
const canGoNext = computed(() => {
  if (currentStepIndex.value >= steps.length - 1) return false;
  if (currentStep.value === 'schedule') return scheduleIsValid.value;
  if (currentStep.value === 'purpose') return purposeIsValid.value;
  if (currentStep.value === 'confirm') return false;
  return true;
});
const subjectLabel = computed(() => props.spaceName || props.modelId || props.spaceId);
const contextLabel = computed(() => `${subjectLabel.value} · campus ${props.campusId}`);
const successSummary = computed(() => {
  if (!selectedSchedule.value) return null;

  return {
    spaceName: props.spaceName,
    date: selectedSchedule.value.date,
    startTime: selectedSchedule.value.startTime,
    endTime: selectedSchedule.value.endTime,
    purpose: selectedPurpose.value.purpose,
  };
});

function resetFlow() {
  selectedSchedule.value = props.initialSchedule ?? null;
  selectedPurpose.value = { purpose: '', description: '' };
  reservationId.value = null;
  confirmStatus.value = 'idle';
  confirmError.value = null;
  if (successStepTimer) {
    window.clearTimeout(successStepTimer);
    successStepTimer = null;
  }
  currentStep.value = 'schedule';
}

watch(() => [props.campusId, props.spaceId], () => {
  resetFlow();
});

watch(() => props.open, (open, wasOpen) => {
  if (open && wasOpen === false) resetFlow();
});

function handleMediaChange(event: MediaQueryListEvent | MediaQueryList) {
  isDesktop.value = event.matches;
}

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleMediaChange);
  if (successStepTimer) window.clearTimeout(successStepTimer);
});

function handleOpenChange(open: boolean) {
  emit('update:open', open);
}

function closeTray() {
  emit('update:open', false);
}

function next() {
  if (!canGoNext.value) return;
  if (currentStep.value === 'purpose') {
    confirmStatus.value = 'idle';
    confirmError.value = null;
  }
  currentStep.value = steps[currentStepIndex.value + 1];
}

function back() {
  if (!canGoBack.value) return;
  currentStep.value = steps[currentStepIndex.value - 1];
}

function handleScheduleChange(schedule: ReservationScheduleSelection | null) {
  selectedSchedule.value = schedule;
  if (!schedule) return;

  const subject = interaction.subject;
  if (subject?.campusId === props.campusId && subject.spaceId === props.spaceId) {
    interaction.updateSchedule(schedule);
  }
}

function handlePurposeChange(selection: ReservationPurposeSelection) {
  selectedPurpose.value = selection;
}

async function handleConfirm() {
  if (!selectedSchedule.value || confirmStatus.value === 'submitting' || confirmStatus.value === 'success') return;

  confirmStatus.value = 'submitting';
  confirmError.value = null;

  try {
    const reservation = await api.createReservation(auth.token, {
      spaceId: props.spaceId,
      date: selectedSchedule.value.date,
      startTime: selectedSchedule.value.startTime,
      endTime: selectedSchedule.value.endTime,
      purpose: selectedPurpose.value.purpose ?? undefined,
      description: selectedPurpose.value.description ?? undefined,
    });

    interaction.setReservation(reservation.id);
    reservationId.value = reservation.id;
    confirmStatus.value = 'success';
    successStepTimer = window.setTimeout(() => {
      currentStep.value = 'success';
    }, 500);
  } catch (e) {
    confirmStatus.value = 'error';
    if (e instanceof ApiError && e.message) {
      confirmError.value = e.message;
    } else {
      confirmError.value = 'Não foi possível confirmar a reserva. Tente novamente.';
    }
  }
}

function handleViewReservations(id: string) {
  void router.push({ name: 'my-reservations', query: { highlight: id } });
  closeTray();
}

function handleBackToMap() {
  closeTray();
}
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="reservation-tray z-[var(--z-modal)]"
      :class="isDesktop
        ? 'top-auto! bottom-[7dvh]! translate-y-0! max-h-[86dvh]! overflow-y-auto'
        : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      :show-close-button="true"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <div class="reservation-tray__body">
        <header class="reservation-tray__header">
          <component :is="isDesktop ? DialogTitle : DrawerTitle" class="reservation-tray__title">
            Fazer reserva
          </component>
          <component :is="isDesktop ? DialogDescription : DrawerDescription" class="reservation-tray__description">
            {{ currentTitle }} para {{ contextLabel }}.
          </component>
        </header>

        <div class="reservation-tray__steps" aria-label="Etapas da reserva">
          <span
            v-for="step in steps"
            :key="step"
            class="reservation-tray__step-dot"
            :class="{ 'reservation-tray__step-dot--active': step === currentStep }"
            :aria-current="step === currentStep ? 'step' : undefined"
          >
            {{ stepTitles[step] }}
          </span>
        </div>

        <ReservationScheduleStep
          v-if="currentStep === 'schedule'"
          :campus-id="campusId"
          :space-id="spaceId"
          :initial-schedule="selectedSchedule"
          @schedule-change="handleScheduleChange"
        />
        <ReservationPurposeStep
          v-else-if="currentStep === 'purpose'"
          :initial-purpose="selectedPurpose"
          @purpose-change="handlePurposeChange"
        />
        <ReservationConfirmStep
          v-else-if="currentStep === 'confirm' && selectedSchedule"
          :space-name="spaceName"
          :schedule="selectedSchedule"
          :purpose="selectedPurpose"
          :status="confirmStatus"
          :error="confirmError"
          @confirm="handleConfirm"
        />
        <ReservationSuccessStep
          v-else-if="currentStep === 'success' && reservationId && successSummary"
          :reservation-id="reservationId"
          :summary="successSummary"
          @view-reservations="handleViewReservations"
          @back-to-map="handleBackToMap"
        />

        <footer v-if="currentStep !== 'success'" class="reservation-tray__actions">
          <Button
            type="button"
            variant="outline"
            class="reservation-tray__button"
            :disabled="!canGoBack || confirmStatus === 'submitting' || confirmStatus === 'success'"
            @click="back"
          >
            Voltar
          </Button>
          <Button v-if="currentStep !== 'confirm'" type="button" class="reservation-tray__button" :disabled="!canGoNext" @click="next">
            Continuar
          </Button>
        </footer>
      </div>
    </component>
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer root, which does not receive this component's scoped attr. -->
<style>
.reservation-tray[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.reservation-tray {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  /* Match RoomPopup (420px) so the tray keeps the same footprint/anchoring as the
     popup it opens from — the flow reads as one container morphing, not a jump. */
  max-width: 420px;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.reservation-tray[data-state="open"] {
  animation: reservation-tray-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}

.reservation-tray[data-state="closed"] {
  animation: reservation-tray-out 0.18s ease-in both;
}

.reservation-tray::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.reservation-tray__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reservation-tray__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reservation-tray__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0;
}

.reservation-tray__description {
  color: var(--muted-foreground);
  font-size: 0.85rem;
  margin: 0;
}

.reservation-tray__steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.reservation-tray__step-dot {
  min-height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--muted);
  color: transparent;
  white-space: nowrap;
}

.reservation-tray__step-dot--active {
  background: var(--primary);
}

.reservation-tray__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.reservation-tray__button {
  min-width: 8rem;
}

@media (max-width: 480px) {
  .reservation-tray {
    max-width: none;
    padding: 0 1.5rem 1.5rem;
    padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
  }

  .reservation-tray__actions {
    flex-direction: column-reverse;
  }

  .reservation-tray__button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reservation-tray[data-state="open"],
  .reservation-tray[data-state="closed"] {
    animation: none !important;
  }
}

@keyframes reservation-tray-in {
  from { opacity: 0; transform: translate(-50%, 28px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

@keyframes reservation-tray-out {
  from { opacity: 1; transform: translate(-50%, 0) scale(1); }
  to { opacity: 0; transform: translate(-50%, 12px) scale(0.97); }
}
</style>
