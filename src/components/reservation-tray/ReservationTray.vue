<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import ReservationScheduleStep from './ReservationScheduleStep.vue';
import ReservationPurposeStep from './ReservationPurposeStep.vue';
import ReservationConfirmStep from './ReservationConfirmStep.vue';
import ReservationSuccessStep from './ReservationSuccessStep.vue';
import RecurringReservationForm from '@/components/RecurringReservationForm.vue';
import { useInteractionStore } from '@/stores/interaction';
import { useAuthStore } from '@/stores/auth';
import { api, ApiError } from '@/services/api';
import type { ActionStatus } from '@/components/StatefulActionButton.vue';
import { campusLabel } from '@/utils/space-labels';
import { usePermissions } from '@/composables/usePermissions';
import type { Reservation } from '@/types/reservation';
import { buildReservationUpdate, reservationEditDraft } from '@/utils/reservation-edit';
import {
  emptyRequester,
  requesterLabel,
  requesterPayload,
  type RequesterSelection,
} from '@/utils/reservation-requester';

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
  reservable?: boolean;
  // Optional pre-fill carried in from another surface (e.g. the maquete's
  // RoomPopup), so the schedule step opens on the same date/range the user
  // already picked. The schedule step trims the range to what is still
  // bookable, and self-corrects to null when nothing in it is.
  initialSchedule?: ReservationScheduleSelection | null;
  // Edit mode (MEL-023): prefilled with this reservation's date, time and
  // description. The space is fixed and the purpose is not editable.
  editingReservation?: Reservation | null;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
  'back-to-map': [];
  updated: [reservation: Reservation];
}>();

const CREATE_STEPS: ReservationTrayStep[] = ['schedule', 'purpose', 'confirm', 'success'];
const EDIT_STEPS: ReservationTrayStep[] = ['schedule', 'purpose', 'confirm'];
const isEditing = computed(() => !!props.editingReservation);
const steps = computed(() => (isEditing.value ? EDIT_STEPS : CREATE_STEPS));
const editDraft = computed(() => (props.editingReservation ? reservationEditDraft(props.editingReservation) : null));
const interaction = useInteractionStore();
const auth = useAuthStore();
const { canCreateRecurring, canReserveOnBehalf } = usePermissions();
const router = useRouter();
const route = useRoute();

const CREATE_STEP_TITLES: Record<ReservationTrayStep, string> = {
  schedule: 'Escolher horário',
  purpose: 'Informar finalidade',
  confirm: 'Confirmar reserva',
  success: 'Reserva concluída',
};
const EDIT_STEP_TITLES: Record<ReservationTrayStep, string> = {
  ...CREATE_STEP_TITLES,
  purpose: 'Editar descrição',
  confirm: 'Revisar alterações',
};
const stepTitles = computed(() => (isEditing.value ? EDIT_STEP_TITLES : CREATE_STEP_TITLES));

const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const mediaQuery = window.matchMedia('(min-width: 768px)');
const currentStep = ref<ReservationTrayStep>('schedule');
const reservationMode = ref<'single' | 'recurring'>('single');
const selectedSchedule = ref<ReservationScheduleSelection | null>(null);
// Edit mode starts from the reservation's purpose and description.
function initialPurpose(): ReservationPurposeSelection {
  const editing = props.editingReservation;
  return editing
    ? { purpose: editing.purpose ?? '', description: editing.description ?? '' }
    : { purpose: '', description: '' };
}

const selectedPurpose = ref<ReservationPurposeSelection>(initialPurpose());
// Staff only (MEL-025): who the new reservation is for. Not editable afterwards.
const selectedRequester = ref<RequesterSelection>(emptyRequester());
const offersRequester = computed(() => canReserveOnBehalf.value && !isEditing.value);
const confirmRequester = computed(() => {
  if (!offersRequester.value) return null;
  const name = requesterLabel(selectedRequester.value);
  if (!name) return null;
  return { name, contact: selectedRequester.value.contact.trim() || null };
});
const reservationId = ref<string | null>(null);
const confirmStatus = ref<ActionStatus>('idle');
const confirmError = ref<string | null>(null);
let successStepTimer: ReturnType<typeof window.setTimeout> | null = null;

// Edit mode: only the fields that changed, or null when nothing did.
const pendingUpdate = computed(() => {
  if (!props.editingReservation || !selectedSchedule.value) return null;
  return buildReservationUpdate(props.editingReservation, {
    schedule: selectedSchedule.value,
    description: selectedPurpose.value.description,
  });
});
const editHasNoChanges = computed(() => isEditing.value && !!selectedSchedule.value && !pendingUpdate.value);

const currentStepIndex = computed(() => steps.value.indexOf(currentStep.value));
const currentTitle = computed(() => reservationMode.value === 'recurring' ? 'Configurar recorrência' : stepTitles.value[currentStep.value]);
const canGoBack = computed(() => currentStepIndex.value > 0 && currentStep.value !== 'success');
const scheduleIsValid = computed(() => !!selectedSchedule.value?.date && !!selectedSchedule.value?.startTime && !!selectedSchedule.value?.endTime);
// The purpose is not editable, so edit mode only needs something to have changed.
const purposeIsValid = computed(() => (isEditing.value ? !!pendingUpdate.value : !!selectedPurpose.value.purpose));
const canGoNext = computed(() => {
  if (currentStepIndex.value >= steps.value.length - 1) return false;
  if (currentStep.value === 'schedule') return scheduleIsValid.value;
  if (currentStep.value === 'purpose') return purposeIsValid.value;
  if (currentStep.value === 'confirm') return false;
  return true;
});
const subjectLabel = computed(() => props.spaceName || props.modelId || props.spaceId);
// "Voltar para maquete" only makes sense when there's somewhere to go: either
// we're already on the viewer (closing the tray lands back on the maquete), or
// the space has a 3D pin we can deep-link to. A space with no `modelId` isn't on
// the model, so we hide the button rather than dead-end the user.
const onViewer = computed(() => route.name === 'viewer');
const canReturnToMap = computed(() => onViewer.value || !!props.modelId);
const contextLabel = computed(() => `${subjectLabel.value} · ${campusLabel(props.campusId)}`);
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
  reservationMode.value = 'single';
  selectedSchedule.value = null;
  selectedPurpose.value = initialPurpose();
  selectedRequester.value = emptyRequester();
  reservationId.value = null;
  confirmStatus.value = 'idle';
  confirmError.value = null;
  if (successStepTimer) {
    window.clearTimeout(successStepTimer);
    successStepTimer = null;
  }
  currentStep.value = 'schedule';
}

function setReservationMode(mode: 'single' | 'recurring') {
  if (mode === 'recurring' && !canCreateRecurring.value) return;
  reservationMode.value = mode;
  if (mode === 'single') currentStep.value = 'schedule';
}

watch(() => [props.campusId, props.spaceId, props.editingReservation?.id], () => {
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
  currentStep.value = steps.value[currentStepIndex.value + 1];
}

function back() {
  if (!canGoBack.value) return;
  currentStep.value = steps.value[currentStepIndex.value - 1];
}

function handleScheduleChange(schedule: ReservationScheduleSelection | null) {
  if (!props.open) return;
  selectedSchedule.value = schedule;
  if (!schedule || isEditing.value) return;

  const subject = interaction.subject;
  if (subject?.campusId === props.campusId && subject.spaceId === props.spaceId) {
    interaction.updateSchedule(schedule);
  }
}

function handlePurposeChange(selection: ReservationPurposeSelection) {
  selectedPurpose.value = selection;
}

async function handleConfirmEdit(reservation: Reservation) {
  const update = pendingUpdate.value;
  if (!update) {
    confirmStatus.value = 'error';
    confirmError.value = 'Nada foi alterado. Mude a data, o horário ou a descrição.';
    return;
  }

  confirmStatus.value = 'submitting';
  confirmError.value = null;

  try {
    const updated = await api.updateReservation(auth.token, reservation.id, update);
    confirmStatus.value = 'success';
    // Hold on "Alterações salvas" briefly, then hand the result back and close.
    successStepTimer = window.setTimeout(() => {
      successStepTimer = null;
      emit('updated', updated);
      closeTray();
    }, 1200);
  } catch (e) {
    confirmStatus.value = 'error';
    confirmError.value = e instanceof ApiError && e.message
      ? e.message
      : 'Não foi possível salvar as alterações. Tente novamente.';
  }
}

async function handleConfirm() {
  if (!selectedSchedule.value || confirmStatus.value === 'submitting' || confirmStatus.value === 'success') return;

  if (props.editingReservation) {
    await handleConfirmEdit(props.editingReservation);
    return;
  }

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
      ...requesterPayload(offersRequester.value ? selectedRequester.value : null),
    });

    interaction.setReservation(reservation.id);
    reservationId.value = reservation.id;
    confirmStatus.value = 'success';
    // Hold on the confirm step long enough to read the button's success colour +
    // "Reserva confirmada" label before the tray advances to the success step.
    successStepTimer = window.setTimeout(() => {
      currentStep.value = 'success';
    }, 1200);
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
  emit('back-to-map');
  // From the maquete the tray overlays the model, so closing is enough. From
  // another surface (e.g. the space browser) deep-link into the viewer focused
  // on this pin so the button actually reaches the maquete.
  if (!onViewer.value && props.modelId) {
    void router.push({
      name: 'viewer',
      params: { campusId: props.campusId },
      query: { space: props.modelId },
    });
  }
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
        : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))] px-6'"
      :show-close-button="true"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <!-- On mobile the body is the drawer's scroll region (the drawer caps at
           80vh): taller steps scroll instead of pushing the actions off-screen.
           Keeping the scroller a child of the drawer lets vaul tell drag-to-dismiss
           apart from content scrolling (same pattern as RoomPopup). -->
      <div class="reservation-tray__body" :class="{ 'reservation-tray__body--scroll': !isDesktop }">
        <header class="reservation-tray__header">
          <component :is="isDesktop ? DialogTitle : DrawerTitle" class="reservation-tray__title">
            {{ isEditing ? 'Editar reserva' : 'Fazer reserva' }}
          </component>
          <component :is="isDesktop ? DialogDescription : DrawerDescription" class="reservation-tray__description">
            {{ currentTitle }} {{ isEditing ? 'em' : 'para' }} {{ contextLabel }}.
          </component>
        </header>

        <div v-if="canCreateRecurring && !isEditing" class="reservation-tray__mode-toggle" role="group" aria-label="Tipo de reserva">
          <Button
            type="button"
            variant="outline"
            class="reservation-tray__mode-button"
            :class="{ 'reservation-tray__mode-button--active': reservationMode === 'single' }"
            :aria-pressed="reservationMode === 'single'"
            @click="setReservationMode('single')"
          >
            Reserva única
          </Button>
          <Button
            type="button"
            variant="outline"
            class="reservation-tray__mode-button"
            :class="{ 'reservation-tray__mode-button--active': reservationMode === 'recurring' }"
            :aria-pressed="reservationMode === 'recurring'"
            @click="setReservationMode('recurring')"
          >
            Reserva recorrente
          </Button>
        </div>

        <div
          v-if="reservationMode === 'single'"
          class="reservation-tray__steps"
          :style="{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }"
          aria-label="Etapas da reserva"
        >
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
          v-if="reservationMode === 'single' && currentStep === 'schedule'"
          :campus-id="campusId"
          :space-id="spaceId"
          :initial-schedule="editDraft ? editDraft.schedule : initialSchedule"
          :exclude-reservation-id="editingReservation?.id ?? null"
          @schedule-change="handleScheduleChange"
        />
        <ReservationPurposeStep
          v-else-if="reservationMode === 'single' && currentStep === 'purpose'"
          :requester="offersRequester ? selectedRequester : null"
          :initial-purpose="selectedPurpose"
          :description-only="isEditing"
          @purpose-change="handlePurposeChange"
          @update:requester="selectedRequester = $event"
        />
        <ReservationConfirmStep
          v-else-if="reservationMode === 'single' && currentStep === 'confirm' && selectedSchedule"
          :space-name="spaceName"
          :schedule="selectedSchedule"
          :purpose="selectedPurpose"
          :status="confirmStatus"
          :error="confirmError"
          :previous="editDraft?.schedule ?? null"
          :requester="confirmRequester"
          @confirm="handleConfirm"
        />
        <ReservationSuccessStep
          v-else-if="reservationMode === 'single' && currentStep === 'success' && reservationId && successSummary"
          :reservation-id="reservationId"
          :summary="successSummary"
          :can-return-to-map="canReturnToMap"
          @view-reservations="handleViewReservations"
          @back-to-map="handleBackToMap"
        />

        <RecurringReservationForm
          v-else-if="reservationMode === 'recurring'"
          :space-id="spaceId"
          :reservable="reservable"
        />

        <p
          v-if="editHasNoChanges && currentStep === 'purpose'"
          class="reservation-tray__hint"
          aria-live="polite"
        >
          Altere a data, o horário ou a descrição para continuar.
        </p>

        <footer v-if="reservationMode === 'single' && currentStep !== 'success'" class="reservation-tray__actions">
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
  /* Hold a consistent height across steps so the container doesn't shrink/grow
     between schedule → purpose → confirm → success — shorter steps (success)
     pad out to keep the bottom-anchored flow seamless. */
  min-height: 26rem;
}

.reservation-tray__body--scroll {
  flex: 1 1 auto;
  /* Keep the steady height while it fits; below that, shrink and scroll. */
  min-height: min(26rem, calc(80vh - 5rem));
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* The step actions stay reachable at the bottom of the scroll region. */
.reservation-tray__body--scroll .reservation-tray__actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  margin-top: auto;
  /* The vaul root doesn't get this component's scoped padding: pad here. */
  padding: 0.75rem 0 calc(0.75rem + var(--safe-bottom, 0px));
  background: var(--popover);
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

.reservation-tray__mode-toggle {
  display: flex;
  gap: 0.5rem;
}

.reservation-tray__mode-button {
  flex: 1;
  min-height: var(--tap-min, 44px);
  font-size: 0.82rem;
}

.reservation-tray__mode-button--active {
  border-color: var(--primary);
  background: var(--secondary);
  color: var(--primary);
  font-weight: 600;
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

.reservation-tray__hint {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
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

  .reservation-tray__mode-toggle {
    flex-direction: column;
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
