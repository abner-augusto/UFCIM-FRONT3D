<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import { usePermissions } from '@/composables/usePermissions';
import { toLocalISODate } from '@/utils/date';
import AppDateField from '@/components/AppDateField.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { canBlock } = usePermissions();

const spaceId = route.params.spaceId as string;
const spaceName = ref<string | null>(null);
const loadingSpace = ref(true);

const selectedDate = ref('');
const selectedBlockType = ref<'maintenance' | 'administrative' | ''>('');
const reason = ref('');

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

const today = toLocalISODate();

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
  if (hourMode.value === 'full_day') return '24:00';
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
  if (!canBlock.value) {
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
      reason: reason.value.trim(),
    });
    successMsg.value = 'Espaço bloqueado com sucesso.';
    setTimeout(() => router.push({ name: 'my-blockings' }), 1500);
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível criar o bloqueio.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="blocking-create-view">
    <div class="view-header">
      <Button variant="ghost" class="back-btn" @click="router.back()">← Voltar</Button>
      <h1>Bloquear Espaço</h1>
    </div>

    <div v-if="loadingSpace" class="state-msg">Carregando...</div>

    <div v-else class="blocking-form">
      <div class="space-info">
        <h2>{{ spaceName }}</h2>
      </div>

      <div class="form-section">
        <Label class="form-label" for="blocking-date">Data</Label>
        <AppDateField id="blocking-date" v-model="selectedDate" :min="today" aria-label="Data do bloqueio" />
      </div>

      <div class="form-section">
        <Label class="form-label">Período</Label>

        <ToggleGroup
          type="single"
          variant="outline"
          class="hour-mode-toggle"
          :model-value="hourMode"
          @update:model-value="(value) => { hourMode = ((value || 'full_day') as HourMode); if (hourMode === 'full_day') { pickedStart = null; pickedEnd = null; } }"
        >
          <ToggleGroupItem value="full_day" class="mode-btn">
            Dia inteiro
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" class="mode-btn">
            Horário personalizado
          </ToggleGroupItem>
        </ToggleGroup>

        <div v-if="hourMode === 'custom'" class="hour-grid">
          <Button
            v-for="slot in ALL_HOURS"
            :key="slot.startTime"
            type="button"
            variant="outline"
            class="hour-btn"
            :class="{
              'hour-btn--endpoint': getHourState(slot.startTime) === 'endpoint',
              'hour-btn--selected': getHourState(slot.startTime) === 'selected',
            }"
            @click="handleHourClick(slot.startTime)"
          >
            {{ slot.startTime.replace(':00', 'h') }}
          </Button>
        </div>

        <p v-if="resolvedStart && resolvedEnd" class="period-summary">
          {{ hourMode === 'full_day'
              ? 'Bloqueio para o dia inteiro (00:00 – 24:00)'
              : `${resolvedStart} – ${resolvedEnd}` }}
        </p>
      </div>

      <div class="form-section">
        <Label class="form-label" for="blocking-type">Tipo de bloqueio</Label>
        <NativeSelect id="blocking-type" v-model="selectedBlockType" class="form-input">
          <NativeSelectOption value="" disabled>Selecione um tipo</NativeSelectOption>
          <NativeSelectOption v-for="(label, type) in BLOCK_TYPE_LABELS" :key="type" :value="type">
            {{ label }}
          </NativeSelectOption>
        </NativeSelect>
      </div>

      <div class="form-section">
        <Label class="form-label" for="blocking-reason">Motivo <span class="optional">(opcional)</span></Label>
        <Textarea
          id="blocking-reason"
          class="form-input form-textarea"
          v-model="reason"
          placeholder="Descreva o motivo do bloqueio..."
          rows="3"
        />
      </div>

      <p v-if="successMsg" class="state-success">{{ successMsg }}</p>
      <p v-if="errorMsg" class="state-error">{{ errorMsg }}</p>

      <div class="form-actions">
        <Button
          class="submit-btn"
          :disabled="!canSubmit || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Bloqueando...' : 'Bloquear Espaço' }}
        </Button>
      </div>
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
  color: #1D9E75;
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
  min-height: var(--tap-min, 44px);
}
.form-textarea {
  resize: vertical;
  font-family: inherit;
  min-height: var(--tap-min, 44px);
}
.hour-mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  width: 100%;
}
.mode-btn {
  min-height: var(--tap-min, 44px);
  flex: 1;
}
.hour-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

@media (min-width: 481px) {
  .hour-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.hour-btn {
  font-size: 0.8rem;
  text-align: center;
  min-height: var(--tap-min, 44px);
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

.form-actions {
  margin-top: 1rem;
}

@media (max-width: 767px) {
  .form-actions {
    position: sticky;
    bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px));
    background: white;
    padding: 0.75rem 0 calc(0.5rem + var(--safe-bottom, 0px));
    z-index: 5;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.06);
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

.submit-btn {
  width: 100%;
  font-size: 1rem;
  min-height: var(--tap-min, 44px);
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  font-size: 0.9rem; font-weight: 500; margin-bottom: 0.75rem; }
</style>
