<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, BLOCK_TYPE_LABELS } from '@/types/reservation';
import type { TimeSlot } from '@/types/reservation';
import { hasRole, CAN_BLOCK } from '@/utils/roles';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const spaceId = route.params.spaceId as string;
const spaceName = ref<string | null>(null);
const loadingSpace = ref(true);

const selectedDate = ref('');
const selectedSlot = ref<TimeSlot | null>(null);
const selectedBlockType = ref<'maintenance' | 'administrative' | 'event' | ''>('');
const reason = ref('');

const loading = ref(false);
const errorMsg = ref<string | null>(null);
const successMsg = ref<string | null>(null);

const today = new Date().toISOString().split('T')[0];

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

const canSubmit = computed(() =>
  selectedDate.value &&
  selectedSlot.value &&
  selectedBlockType.value
);

async function handleSubmit() {
  if (!canSubmit.value || !selectedSlot.value || !selectedBlockType.value) return;
  const { startTime, endTime } = TIME_SLOT_RANGES[selectedSlot.value];
  loading.value = true;
  errorMsg.value = null;
  try {
    await api.createBlocking(auth.token, {
      spaceId,
      date: selectedDate.value,
      startTime,
      endTime,
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
        <div class="slot-grid">
          <button
            v-for="(label, slot) in TIME_SLOT_LABELS"
            :key="slot"
            class="slot-btn"
            :class="{ 'slot-btn--selected': selectedSlot === slot }"
            @click="selectedSlot = slot as TimeSlot"
          >
            {{ label }} ({{ TIME_SLOT_RANGES[slot as TimeSlot].startTime }}–{{ TIME_SLOT_RANGES[slot as TimeSlot].endTime }})
          </button>
        </div>
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
.slot-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.slot-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: left;
  font-size: 0.9rem;
  transition: border-color 0.15s, background 0.15s;
}
.slot-btn--selected {
  border-color: #1D9E75;
  background: #e8f5f0;
  color: #1D9E75;
  font-weight: 600;
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
