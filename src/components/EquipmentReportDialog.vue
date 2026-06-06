<script setup lang="ts">
import { ref, computed } from 'vue';
import { SEVERITY_LABELS } from '@/types/equipment-report';
import { api, ApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { Check } from 'lucide-vue-next';
import type { Equipment } from '@/types/space';

const props = defineProps<{
  equipment: Equipment;
  spaceName: string;
}>();

const emit = defineEmits<{
  close: [];
  reported: [];
}>();

const auth = useAuthStore();

// Form state
const severity = ref<'minor' | 'major' | 'blocking' | null>(null);
const description = ref('');
const submitted = ref(false);
const loading = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

// Validation
const descriptionValid = computed(() => description.value.trim().length >= 5);
const descriptionCount = computed(() => description.value.length);
const formValid = computed(() => severity.value !== null && descriptionValid.value);

function selectSeverity(value: 'minor' | 'major' | 'blocking') {
  if (!loading.value) {
    severity.value = value;
  }
}

async function submitReport() {
  if (!formValid.value || !auth.token || loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    await api.createEquipmentReport(auth.token, props.equipment.id, {
      description: description.value.trim(),
      severity: severity.value!,
    });
    success.value = true;
    submitted.value = true;
    // Auto-close after 1.5s on success
    setTimeout(() => emit('reported'), 1500);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 409) {
        error.value = 'Você já reportou este equipamento nas últimas 24h';
      } else {
        error.value = e.message || 'Erro ao enviar';
      }
    } else {
      error.value = 'Erro ao enviar. Tente novamente.';
    }
  } finally {
    loading.value = false;
  }
}

function onOverlayClick() {
  if (!loading.value) emit('close');
}
</script>

<template>
  <div class="dialog-overlay" @click.self="onOverlayClick">
    <div class="dialog" role="dialog" aria-labelledby="dialog-title">
      <button class="dialog__close" @click="onOverlayClick" aria-label="Fechar">&times;</button>

      <!-- Success state -->
      <template v-if="success">
        <div class="dialog-success">
          <span class="dialog-success__icon"><Check :size="24" /></span>
          <p class="dialog-success__text">Problema reportado. A equipe foi notificada.</p>
        </div>
      </template>

      <!-- Form state -->
      <template v-else>
        <h2 id="dialog-title" class="dialog__title">Reportar problema</h2>
        <p class="dialog__subtitle">
          {{ equipment.name }} · {{ spaceName }}
        </p>

        <!-- Severity selector -->
        <div class="dialog__field">
          <label class="dialog__label">Gravidade</label>
          <div class="severity-options">
            <button
              v-for="s in (['minor', 'major', 'blocking'] as const)"
              :key="s"
              type="button"
              class="severity-btn"
              :class="{ 'severity-btn--selected': severity === s, [`severity-btn--${s}`]: severity === s }"
              :aria-pressed="severity === s"
              @click="selectSeverity(s)"
            >
              <span class="severity-btn__label">{{ SEVERITY_LABELS[s] }}</span>
            </button>
          </div>
        </div>

        <!-- Description textarea -->
        <div class="dialog__field">
          <label class="dialog__label" for="report-desc">Descrição do problema</label>
          <textarea
            id="report-desc"
            v-model="description"
            class="dialog__textarea"
            :class="{ 'dialog__textarea--invalid': submitted && !descriptionValid }"
            placeholder="Descreva o que está acontecendo..."
            maxlength="500"
            rows="4"
          />
          <div class="dialog__field-footer">
            <span
              v-if="submitted && !descriptionValid"
              class="dialog__field-error"
            >
              Mínimo de 5 caracteres
            </span>
            <span class="dialog__char-count">{{ descriptionCount }}/500</span>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="dialog__error">
          {{ error }}
        </div>

        <!-- Submit button -->
        <button
          class="dialog__submit"
          :disabled="loading || !formValid"
          @click="submitReport"
        >
          <span v-if="loading" class="dialog__spinner" />
          <span v-else>Enviar</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1.25rem;
  z-index: 300;
  animation: overlay-in 0.25s ease both;
}

@media (max-width: 1023px) {
  .dialog-overlay {
    position: fixed;
    z-index: 500;
  }
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog {
  background: white;
  border-radius: 20px;
  padding: 1.5rem 1.5rem 1.25rem;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  position: relative;
  animation: dialog-in 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

.dialog::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 1rem;
}

@keyframes dialog-in {
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dialog__close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111;
  margin: 0 2rem 0.15rem 0;
}

.dialog__subtitle {
  color: #888;
  font-size: 0.8rem;
  margin: 0 0 1rem;
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
  color: #888;
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
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  background: #fafafa;
  font-size: 0.82rem;
  color: #444;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  min-height: 44px;
}

.severity-btn:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.severity-btn--selected {
  border-width: 2px;
}

.severity-btn--selected.severity-btn--minor {
  background: #fef9e7;
  border-color: #f1c40f;
  color: #7d6608;
}

.severity-btn--selected.severity-btn--major {
  background: #fdf2f2;
  border-color: #e74c3c;
  color: #922b21;
}

.severity-btn--selected.severity-btn--blocking {
  background: #fce4ec;
  border-color: #c0392b;
  color: #7b241c;
}

.severity-btn__label {
  font-weight: 500;
}

/* Textarea */
.dialog__textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #333;
  background: #fafafa;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.dialog__textarea:focus {
  outline: none;
  border-color: #1D9E75;
  background: #fff;
}

.dialog__textarea--invalid {
  border-color: #e74c3c;
  background: #fdf2f2;
}

.dialog__field-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3rem;
}

.dialog__field-error {
  font-size: 0.72rem;
  color: #e74c3c;
}

.dialog__char-count {
  font-size: 0.68rem;
  color: #aaa;
  margin-left: auto;
}

/* Error banner */
.dialog__error {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: #fdf2f2;
  border: 1px solid #f5c6cb;
  color: #991b1b;
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
}

/* Submit button */
.dialog__submit {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog__submit:hover:not(:disabled) {
  background: #178a65;
}

.dialog__submit:disabled {
  background: #b8c8c2;
  cursor: not-allowed;
}

/* Spinner */
.dialog__spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
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
  background: #d1fae5;
  color: #065f46;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.dialog-success__text {
  font-size: 0.9rem;
  color: #065f46;
  font-weight: 500;
  margin: 0;
}
</style>
