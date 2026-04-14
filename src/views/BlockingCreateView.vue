<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import { hasRole, CAN_BLOCK } from '@/utils/roles';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const spaceId = route.params.spaceId as string;
const spaceName = ref<string | null>(null);
const loadingSpace = ref(true);

const selectedDate = ref('');
const selectedBlockType = ref<'maintenance' | 'administrative' | ''>('');
const reason = ref('');

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

const today = new Date().toISOString().split('T')[0];

// Hour selection mode
type HourMode = 'full_day' | 'custom';
const hourMode = ref<HourMode>('full_day');

const pickedStart = ref<string | null>(null);
const pickedEnd = ref<string | null>(null);

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { startTime: `${h}:00`, endTime: `${String(i + 1).padStart(2, '0')}:00` };
});

const resolvedStart = computed(() => {
  if (hourMode.value === 'full_day') return '00:00';
  return pickedStart.value;
});

const resolvedEnd = computed(() => {
  if (hourMode.value === 'full_day') return '23:00';
  if (pickedEnd.value) {
    const slot = ALL_HOURS.find(h => h.startTime === pickedEnd.value);
    return slot?.endTime ?? pickedEnd.value;
  }
  if (pickedStart.value) {
    const slot = ALL_HOURS.find(h => h.startTime === pickedStart.value);
    return slot?.endTime ?? null;
  }
  return null;
});

const canSubmit = computed(() =>
  selectedDate.value &&
  selectedBlockType.value &&
  resolvedStart.value !== null &&
  resolvedEnd.value !== null &&
  resolvedStart.value < resolvedEnd.value
);

function handleHourClick(h: string) {
  if (!pickedStart.value) {
    pickedStart.value = h;
    pickedEnd.value = null;
    return;
  }
  if (h === pickedStart.value && !pickedEnd.value) {
    pickedStart.value = null;
    return;
  }
  if (pickedEnd.value) {
    pickedStart.value = h;
    pickedEnd.value = null;
    return;
  }
  const [lo, hi] = h > pickedStart.value
    ? [pickedStart.value, h]
    : [h, pickedStart.value];
  pickedStart.value = lo;
  pickedEnd.value = hi;
}

function getHourState(h: string): 'available' | 'selected' | 'endpoint' {
  if (!pickedStart.value) return 'available';
  if (h === pickedStart.value || h === pickedEnd.value) return 'endpoint';
  if (pickedEnd.value && h > pickedStart.value && h < pickedEnd.value) return 'selected';
  return 'available';
}

onMounted(async () => {
  if (!hasRole(auth.userRole, CAN_BLOCK)) {
    router.replace({ name: 'campus-select' });
    return;
  }
  try {
    const space = await api.getSpace(auth.token, spaceId);
    spaceName.value = space.name;
  } catch {
    spaceName.value = 'Espaço';
  } finally {
    loadingSpace.value = false;
  }
});

async function handleSubmit() {
  if (!canSubmit.value || !selectedBlockType.value ||
      !resolvedStart.value || !resolvedEnd.value) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    await api.createBlocking(auth.token, {
      spaceId,
      date: selectedDate.value,
      startTime: resolvedStart.value,
      endTime: resolvedEnd.value,
      blockType: selectedBlockType.value,
      reason: reason.value.trim() || undefined,
    });
    successMsg.value = 'Espaço bloqueado com sucesso.';
    setTimeout(() => router.push({ name: 'my-blockings' }), 1500);
  } catch (e: any) {
    errorMsg.value = e?.message || 'Não foi possível criar o bloqueio.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="blocking-create-view">
    <div class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Bloquear Espaço</h1>
    </div>

    <div v-if="loadingSpace" class="state-msg">Carregando...</div>

    <div v-else class="blocking-form">
      <div class="space-info">
        <h2>{{ spaceName }}</h2>
      </div>

      <div class="form-section">
        <label class="form-label">Data</label>
        <input
          type="date"
          class="form-input"
          v-model="selectedDate"
          :min="today"
        />
      </div>

      <div class="form-section">
        <label class="form-label">Período</label>

        <div class="hour-mode-toggle">
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': hourMode === 'full_day' }"
            @click="hourMode = 'full_day'; pickedStart = null; pickedEnd = null"
          >
            Dia inteiro
          </button>
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': hourMode === 'custom' }"
            @click="hourMode = 'custom'"
          >
            Horário personalizado
          </button>
        </div>

        <div v-if="hourMode === 'custom'" class="hour-grid">
          <button
            v-for="slot in ALL_HOURS"
            :key="slot.startTime"
            class="hour-btn"
            :class="{
              'hour-btn--endpoint': getHourState(slot.startTime) === 'endpoint',
              'hour-btn--selected': getHourState(slot.startTime) === 'selected',
            }"
            @click="handleHourClick(slot.startTime)"
          >
            {{ slot.startTime.replace(':00', 'h') }}
          </button>
        </div>

        <p v-if="resolvedStart && resolvedEnd" class="period-summary">
          {{ hourMode === 'full_day'
              ? 'Bloqueio para o dia inteiro (00:00 – 23:00)'
              : `${resolvedStart} – ${resolvedEnd}` }}
        </p>
      </div>

      <div class="form-section">
        <label class="form-label">Tipo de bloqueio</label>
        <select class="form-input" v-model="selectedBlockType">
          <option value="" disabled>Selecione um tipo</option>
          <option v-for="(label, type) in BLOCK_TYPE_LABELS" :key="type" :value="type">
            {{ label }}
          </option>
        </select>
      </div>

      <div class="form-section">
        <label class="form-label">Motivo <span class="optional">(opcional)</span></label>
        <textarea
          class="form-input form-textarea"
          v-model="reason"
          placeholder="Descreva o motivo do bloqueio..."
          rows="3"
        />
      </div>

      <p v-if="successMsg" class="state-success">{{ successMsg }}</p>
      <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

      <button
        class="submit-btn"
        :disabled="!canSubmit || loading"
        @click="handleSubmit"
      >
        {{ loading ? 'Bloqueando...' : 'Bloquear Espaço' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.blocking-create-view {
  max-width: 540px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.view-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
}
.space-info {
  background: #f8f8f8;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}
.space-info h2 {
  margin: 0;
  font-size: 1.1rem;
}
.form-section {
  margin-bottom: 1.25rem;
}
.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}
.optional {
  font-weight: 400;
  color: #888;
}
.form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.form-textarea {
  resize: vertical;
  font-family: inherit;
}
.hour-mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.mode-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
}
.mode-btn--active {
  border-color: #1D9E75;
  background: #e8f5f0;
  color: #1D9E75;
  font-weight: 600;
}
.hour-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.hour-btn {
  padding: 0.4rem 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: center;
  transition: background 0.1s, border-color 0.1s;
}
.hour-btn:hover { border-color: #1D9E75; }
.hour-btn--endpoint {
  background: #1D9E75;
  border-color: #1D9E75;
  color: white;
  font-weight: 600;
}
.hour-btn--selected {
  background: #d4edea;
  border-color: #1D9E75;
}
.period-summary {
  font-size: 0.85rem;
  color: #555;
  margin: 0.25rem 0 0;
}
.submit-btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 10px;
  background: #1D9E75;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.submit-btn:hover:not(:disabled) {
  background: #178a65;
}
.state-msg {
  color: #888;
  font-size: 0.9rem;
}
.state-error {
  color: #c0392b;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}
.state-success {
  color: #1D9E75;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}
</style>
