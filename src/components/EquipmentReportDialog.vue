<script setup lang="ts">
import { ref, computed, type Component } from 'vue';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  SEVERITY_LABELS,
  type MaintenanceCategory,
  type OpenReportStatus,
} from '@/types/equipment-report';
import { api, ApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import {
  Armchair,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Droplets,
  Ellipsis,
  Lightbulb,
  Monitor,
  PaintRoller,
  PanelTop,
  Plug,
} from '@lucide/vue';
import type { Equipment } from '@/types/space';
import type { ReportableEquipment, ReportedTarget } from '@/composables/useRoomDetail';
import { isTicketDescriptionValid, OPEN_REPORT_STATUS_LABELS, type TicketTarget } from '@/utils/maintenance-tickets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Maintenance ticket dialog. Opened on an equipment row, it goes straight to
 * the form; opened from the room, it first asks what has the problem: one
 * equipment, or the room itself by service category (MEL-026).
 */
const props = withDefaults(
  defineProps<{
    spaceId: string;
    spaceName: string;
    /** Preselected equipment: skips the first steps. */
    equipment?: Equipment | null;
    /** Equipment groups that can still be reported. */
    equipmentOptions?: ReportableEquipment[];
    /** Open room tickets per category; those categories cannot be reported again. */
    roomReportStatus?: Partial<Record<MaintenanceCategory, OpenReportStatus>>;
  }>(),
  { equipment: null, equipmentOptions: () => [], roomReportStatus: () => ({}) },
);

const emit = defineEmits<{
  close: [];
  reported: [target: ReportedTarget];
}>();

const auth = useAuthStore();

type Step = 'target' | 'equipment' | 'category' | 'form';

const CATEGORY_ICONS: Record<MaintenanceCategory, Component> = {
  lighting: Lightbulb,
  electrical: Plug,
  painting: PaintRoller,
  ceiling: PanelTop,
  doors_windows: DoorOpen,
  plumbing: Droplets,
  furniture: Armchair,
  other: Ellipsis,
};

// Navigation: forward slides in from the right, back from the left.
const step = ref<Step>(props.equipment ? 'form' : 'target');
const direction = ref<'forward' | 'back'>('forward');
const selectedEquipment = ref<Equipment | null>(props.equipment);
const selectedCategory = ref<MaintenanceCategory | null>(null);

function goTo(next: Step, dir: 'forward' | 'back' = 'forward') {
  direction.value = dir;
  error.value = null;
  step.value = next;
}

const canGoBack = computed(() => step.value !== 'target' && !(step.value === 'form' && props.equipment));

function goBack() {
  if (step.value === 'form') {
    submitted.value = false;
    goTo(selectedCategory.value ? 'category' : 'equipment', 'back');
  } else {
    goTo('target', 'back');
  }
}

function chooseEquipment(item: Equipment) {
  selectedEquipment.value = item;
  selectedCategory.value = null;
  goTo('form');
}

function chooseCategory(category: MaintenanceCategory) {
  if (props.roomReportStatus[category]) return;
  selectedCategory.value = category;
  selectedEquipment.value = null;
  goTo('form');
}

const noEquipmentHint = computed(() => {
  if (props.equipmentOptions.length) return 'Projetor, ar-condicionado, computador…';
  return 'Nenhum equipamento disponível para reportar';
});

// Form state
const severity = ref<'minor' | 'major' | 'blocking' | null>(null);
const description = ref('');
const submitted = ref(false);
const loading = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

const target = computed<TicketTarget>(() =>
  selectedCategory.value ? { kind: 'room', category: selectedCategory.value } : { kind: 'equipment' },
);
const descriptionOptional = computed(
  () => target.value.kind === 'room' && target.value.category !== 'other',
);
const descriptionValid = computed(() => isTicketDescriptionValid(target.value, description.value));
const descriptionCount = computed(() => description.value.length);
const formValid = computed(() => severity.value !== null && descriptionValid.value);
const subject = computed(() =>
  selectedCategory.value
    ? MAINTENANCE_CATEGORY_LABELS[selectedCategory.value]
    : (selectedEquipment.value?.name ?? ''),
);
const descriptionPlaceholder = computed(() => {
  if (!selectedCategory.value) return 'Descreva o que está acontecendo...';
  if (selectedCategory.value === 'other') return 'Conte o que está acontecendo na sala...';
  return 'Se quiser, conte mais detalhes...';
});

const title = computed(() => {
  if (step.value === 'equipment') return 'Qual equipamento?';
  if (step.value === 'category') return 'Qual o problema na sala?';
  return 'Reportar problema';
});
const subtitle = computed(() =>
  step.value === 'form' && subject.value ? `${subject.value} · ${props.spaceName}` : props.spaceName,
);

function selectSeverity(value: 'minor' | 'major' | 'blocking') {
  if (!loading.value) {
    severity.value = value;
  }
}

async function submitReport() {
  submitted.value = true;
  if (!formValid.value || !auth.token || loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    let reported: ReportedTarget;
    if (selectedCategory.value) {
      await api.createRoomReport(auth.token, {
        spaceId: props.spaceId,
        category: selectedCategory.value,
        description: description.value.trim(),
        severity: severity.value!,
      });
      reported = { kind: 'room', category: selectedCategory.value };
    } else {
      const item = selectedEquipment.value!;
      await api.createEquipmentReport(auth.token, item.id, {
        description: description.value.trim(),
        severity: severity.value!,
      });
      reported = { kind: 'equipment', equipmentId: item.id };
    }
    success.value = true;
    // Auto-close after 1.5s on success
    setTimeout(() => emit('reported', reported), 1500);
  } catch (e) {
    if (e instanceof ApiError) {
      // 409: an open ticket already exists (MEL-015/MEL-026) or the same user
      // reported it in the last 24h — the API message tells which.
      error.value = e.message || (e.status === 409 ? 'Já existe um chamado em aberto para este problema.' : 'Erro ao enviar');
    } else {
      error.value = 'Erro ao enviar. Tente novamente.';
    }
  } finally {
    loading.value = false;
  }
}

function handleOpenChange(open: boolean) {
  if (!open && !loading.value) emit('close');
}
</script>

<template>
  <Dialog :open="true" @update:open="handleOpenChange">
    <DialogContent class="dialog z-[var(--z-modal)]" :show-close-button="!loading">
      <!-- Success state -->
      <template v-if="success">
        <DialogTitle class="sr-only">Problema reportado</DialogTitle>
        <DialogDescription class="sr-only">{{ subtitle }}</DialogDescription>
        <div class="dialog-success">
          <span class="dialog-success__icon"><Check :size="24" /></span>
          <p class="dialog-success__text">Problema reportado. A equipe foi notificada.</p>
        </div>
      </template>

      <template v-else>
        <div class="dialog__header">
          <Button
            v-if="canGoBack"
            type="button"
            variant="ghost"
            size="icon"
            class="dialog__back"
            aria-label="Voltar"
            :disabled="loading"
            @click="goBack"
          >
            <ChevronLeft :size="20" />
          </Button>
          <div class="min-w-0">
            <DialogTitle class="dialog__title">{{ title }}</DialogTitle>
            <DialogDescription class="dialog__subtitle">{{ subtitle }}</DialogDescription>
          </div>
        </div>

        <Transition :name="`step-${direction}`" mode="out-in">
          <!-- Step 1: what has the problem -->
          <div v-if="step === 'target'" key="target" class="dialog__step">
            <p class="dialog__question">O que está com problema?</p>
            <div class="choice-list">
              <Button
                type="button"
                variant="outline"
                class="choice-btn"
                :disabled="!equipmentOptions.length"
                @click="goTo('equipment')"
              >
                <span class="choice-btn__icon" aria-hidden="true"><Monitor :size="20" /></span>
                <span class="choice-btn__text">
                  <span class="choice-btn__label">Um equipamento</span>
                  <span class="choice-btn__hint">{{ noEquipmentHint }}</span>
                </span>
                <ChevronRight :size="18" class="choice-btn__chevron" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" class="choice-btn" @click="goTo('category')">
                <span class="choice-btn__icon" aria-hidden="true"><DoorOpen :size="20" /></span>
                <span class="choice-btn__text">
                  <span class="choice-btn__label">A sala (outro problema)</span>
                  <span class="choice-btn__hint">Iluminação, tomadas, pintura, portas…</span>
                </span>
                <ChevronRight :size="18" class="choice-btn__chevron" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <!-- Step 2a: which equipment -->
          <div v-else-if="step === 'equipment'" key="equipment" class="dialog__step">
            <div class="choice-list">
              <Button
                v-for="option in equipmentOptions"
                :key="option.name"
                type="button"
                variant="outline"
                class="choice-btn choice-btn--compact"
                @click="chooseEquipment(option.equipment)"
              >
                <span class="choice-btn__label">{{ option.name }}</span>
                <ChevronRight :size="18" class="choice-btn__chevron" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <!-- Step 2b: room category -->
          <div v-else-if="step === 'category'" key="category" class="dialog__step">
            <div class="category-grid">
              <Button
                v-for="c in MAINTENANCE_CATEGORIES"
                :key="c"
                type="button"
                variant="outline"
                class="category-btn"
                :disabled="!!roomReportStatus[c]"
                :aria-describedby="roomReportStatus[c] ? `category-status-${c}` : undefined"
                @click="chooseCategory(c)"
              >
                <component :is="CATEGORY_ICONS[c]" :size="20" class="category-btn__icon" aria-hidden="true" />
                <span class="category-btn__label">{{ MAINTENANCE_CATEGORY_LABELS[c] }}</span>
                <span
                  v-if="roomReportStatus[c]"
                  :id="`category-status-${c}`"
                  class="category-btn__status"
                >
                  {{ OPEN_REPORT_STATUS_LABELS[roomReportStatus[c]!] }}
                </span>
              </Button>
            </div>
          </div>

          <!-- Step 3: severity and description -->
          <div v-else key="form" class="dialog__step">
            <div class="dialog__field">
              <Label class="dialog__label">Gravidade</Label>
              <div class="severity-options">
                <Button
                  v-for="s in (['minor', 'major', 'blocking'] as const)"
                  :key="s"
                  type="button"
                  variant="outline"
                  class="severity-btn"
                  :class="{ 'severity-btn--selected': severity === s, [`severity-btn--${s}`]: severity === s }"
                  :aria-pressed="severity === s"
                  @click="selectSeverity(s)"
                >
                  <span class="severity-btn__label">{{ SEVERITY_LABELS[s] }}</span>
                </Button>
              </div>
            </div>

            <div class="dialog__field">
              <Label class="dialog__label" for="report-desc">
                {{ descriptionOptional ? 'Descrição (opcional)' : 'Descrição do problema' }}
              </Label>
              <Textarea
                id="report-desc"
                v-model="description"
                class="dialog__textarea"
                :class="{ 'dialog__textarea--invalid': submitted && !descriptionValid }"
                :aria-invalid="submitted && !descriptionValid"
                aria-describedby="report-desc-help"
                :placeholder="descriptionPlaceholder"
                maxlength="500"
                rows="4"
              />
              <div id="report-desc-help" class="dialog__field-footer">
                <span v-if="submitted && !descriptionValid" class="dialog__field-error">
                  Mínimo de 5 caracteres
                </span>
                <span class="dialog__char-count">{{ descriptionCount }}/500</span>
              </div>
            </div>

            <div v-if="error" class="dialog__error" role="alert">
              {{ error }}
            </div>

            <Button
              class="dialog__submit"
              :disabled="loading || severity === null"
              @click="submitReport"
            >
              <span v-if="loading" class="dialog__spinner" />
              <span v-else>Enviar</span>
            </Button>
          </div>
        </Transition>
      </template>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.dialog {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem 1.5rem 1.25rem;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  animation: dialog-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.dialog::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

@keyframes dialog-in {
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dialog__header {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  margin: 0 2rem 1rem 0;
}

.dialog__back {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin: -0.6rem 0 0 -0.75rem;
  color: var(--muted-foreground);
}

.dialog__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--foreground);
  margin: 0 0 0.15rem;
}

.dialog__subtitle {
  color: var(--muted-foreground);
  font-size: 0.8rem;
  margin: 0;
}

.dialog__question {
  font-size: 0.9rem;
  color: var(--foreground);
  margin: 0 0 0.6rem;
}

/* Step transitions: the path forward slides left, back slides right. */
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 0.16s ease, transform 0.2s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
}
.step-forward-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(18px);
}
.step-forward-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

@media (prefers-reduced-motion: reduce) {
  .dialog { animation: none; }
  .step-forward-enter-active,
  .step-forward-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 0.12s linear;
  }
  .step-forward-enter-from,
  .step-forward-leave-to,
  .step-back-enter-from,
  .step-back-leave-to {
    transform: none;
  }
}

/* Choices (steps 1 and 2a) */
.choice-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  height: auto;
  min-height: 64px;
  padding: 0.75rem 0.85rem;
  border: 1.5px solid var(--input);
  border-radius: 12px;
  background: var(--background);
  color: var(--foreground);
  text-align: left;
  white-space: normal;
  justify-content: flex-start;
}

.choice-btn--compact {
  min-height: 48px;
}

.choice-btn:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--border);
}

.choice-btn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--muted);
  color: var(--primary);
}

.choice-btn__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.choice-btn__label {
  font-size: 0.9rem;
  font-weight: 600;
  flex: 1;
}

.choice-btn__hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--muted-foreground);
}

.choice-btn__chevron {
  flex-shrink: 0;
  color: var(--muted-foreground);
}

/* Room categories (step 2b) */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35rem;
  height: auto;
  min-height: 76px;
  padding: 0.7rem 0.75rem;
  border: 1.5px solid var(--input);
  border-radius: 12px;
  background: var(--background);
  color: var(--foreground);
  text-align: left;
  white-space: normal;
}

.category-btn:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--border);
}

.category-btn__icon {
  color: var(--primary);
}

.category-btn:disabled .category-btn__icon {
  color: var(--muted-foreground);
}

.category-btn__label {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
}

.category-btn__status {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

/* Field */
.dialog__field {
  margin-bottom: 1rem;
}

.dialog__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted-foreground);
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
}

/* Severity buttons */
.severity-options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.severity-btn {
  display: block;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid var(--input);
  border-radius: 10px;
  background: var(--background);
  font-size: 0.82rem;
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  min-height: 44px;
}

.severity-btn:hover {
  background: var(--accent);
  border-color: var(--border);
}

.severity-btn--selected {
  border-width: 2px;
}

.severity-btn--selected.severity-btn--minor {
  background: var(--warning-surface);
  border-color: var(--warning);
  color: var(--warning);
}

.severity-btn--selected.severity-btn--major {
  background: var(--danger-surface);
  border-color: var(--danger-fg);
  color: var(--danger-fg);
}

.severity-btn--selected.severity-btn--blocking {
  background: color-mix(in srgb, var(--destructive) 15%, transparent);
  border-color: var(--destructive);
  color: var(--destructive);
}

.severity-btn__label {
  font-weight: 500;
}

/* Textarea */
.dialog__textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid var(--input);
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--foreground);
  background: var(--muted);
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.dialog__textarea:focus {
  outline: none;
  border-color: var(--ring);
  background: var(--background);
}

.dialog__textarea--invalid {
  border-color: var(--destructive);
  background: var(--danger-surface);
}

.dialog__field-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3rem;
}

.dialog__field-error {
  font-size: 0.72rem;
  color: var(--destructive);
}

.dialog__char-count {
  font-size: 0.68rem;
  color: var(--muted-foreground);
  margin-left: auto;
}

/* Error banner */
.dialog__error {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: var(--danger-surface);
  border: 1px solid var(--danger-border);
  color: var(--danger-fg);
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
}

/* Submit button */
.dialog__submit {
  width: 100%;
  padding: 0.8rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.15s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog__submit:disabled {
  cursor: not-allowed;
}

/* Spinner */
.dialog__spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid color-mix(in srgb, var(--primary-foreground) 35%, transparent);
  border-top-color: var(--primary-foreground);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success state */
.dialog-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
  text-align: center;
}

.dialog-success__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--success-surface);
  color: var(--success);
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.dialog-success__text {
  font-size: 0.9rem;
  color: var(--success);
  font-weight: 500;
  margin: 0;
}
</style>
