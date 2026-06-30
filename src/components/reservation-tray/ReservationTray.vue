<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import ReservationScheduleStep from './ReservationScheduleStep.vue';
import ReservationPurposeStep from './ReservationPurposeStep.vue';
import ReservationConfirmStep from './ReservationConfirmStep.vue';
import ReservationSuccessStep from './ReservationSuccessStep.vue';
import { useInteractionStore } from '@/stores/interaction';

export type ReservationTrayStep = 'schedule' | 'purpose' | 'confirm' | 'success';

interface ReservationScheduleSelection {
  date: string;
  startTime: string;
  endTime: string;
}

const props = defineProps<{
  open: boolean;
  campusId: string;
  spaceId: string;
  spaceName: string;
  modelId?: string | null;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
}>();

const steps: ReservationTrayStep[] = ['schedule', 'purpose', 'confirm', 'success'];
const interaction = useInteractionStore();

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

const currentStepIndex = computed(() => steps.indexOf(currentStep.value));
const currentTitle = computed(() => stepTitles[currentStep.value]);
const canGoBack = computed(() => currentStepIndex.value > 0 && currentStep.value !== 'success');
const scheduleIsValid = computed(() => !!selectedSchedule.value?.date && !!selectedSchedule.value?.startTime && !!selectedSchedule.value?.endTime);
const canGoNext = computed(() => {
  if (currentStepIndex.value >= steps.length - 1) return false;
  if (currentStep.value === 'schedule') return scheduleIsValid.value;
  return true;
});
const subjectLabel = computed(() => props.spaceName || props.modelId || props.spaceId);
const contextLabel = computed(() => `${subjectLabel.value} · campus ${props.campusId}`);

watch(() => [props.campusId, props.spaceId], () => {
  selectedSchedule.value = null;
  currentStep.value = 'schedule';
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
  emit('update:open', open);
}

function next() {
  if (!canGoNext.value) return;
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
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="reservation-tray z-[var(--z-modal)]"
      :class="isDesktop ? '' : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
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
        <ReservationPurposeStep v-else-if="currentStep === 'purpose'" />
        <ReservationConfirmStep v-else-if="currentStep === 'confirm'" />
        <ReservationSuccessStep v-else />

        <footer class="reservation-tray__actions">
          <Button type="button" variant="outline" class="reservation-tray__button" :disabled="!canGoBack" @click="back">
            Voltar
          </Button>
          <Button type="button" class="reservation-tray__button" :disabled="!canGoNext" @click="next">
            {{ currentStep === 'confirm' ? 'Concluir' : 'Continuar' }}
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
  max-width: 480px;
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
