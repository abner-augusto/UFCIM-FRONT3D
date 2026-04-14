<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Blocking } from '@/types/reservation';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import { hasRole, CAN_BLOCK } from '@/utils/roles';

const router = useRouter();
const auth = useAuthStore();

const blockings = ref<Blocking[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const removing = ref<string | null>(null);

onMounted(async () => {
  if (!hasRole(auth.userRole, CAN_BLOCK)) {
    router.replace({ name: 'campus-select' });
    return;
  }
  await loadBlockings();
});

async function loadBlockings() {
  loading.value = true;
  errorMsg.value = null;
  try {
    blockings.value = await api.getMyBlockings(auth.token);
  } catch {
    errorMsg.value = 'Não foi possível carregar seus bloqueios.';
  } finally {
    loading.value = false;
  }
}

async function handleRemove(id: string) {
  if (!confirm('Tem certeza que deseja remover este bloqueio?')) return;
  removing.value = id;
  try {
    await api.removeBlocking(auth.token, id);
    await loadBlockings();
  } catch {
    errorMsg.value = 'Não foi possível remover o bloqueio.';
  } finally {
    removing.value = null;
  }
}

const dateLabel = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

function spaceName(b: Blocking): string {
  if (b.space?.name) return `${b.space.name} — Bloco ${b.space.block}`;
  return b.spaceName ?? b.spaceId;
}
</script>

<template>
  <div class="my-blockings-view">
    <div class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Meus Bloqueios</h1>
    </div>

    <div v-if="loading" class="state-msg">Carregando bloqueios...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="blockings.length === 0" class="state-empty">
      <p>Você não tem bloqueios ativos.</p>
    </div>

    <ul v-else class="blocking-list">
      <li v-for="b in blockings" :key="b.id" class="blocking-card">
        <div class="blocking-card__info">
          <h3>{{ spaceName(b) }}</h3>
          <p>{{ dateLabel(b.date) }}</p>
          <p>{{ b.startTime }}–{{ b.endTime }} · {{ BLOCK_TYPE_LABELS[b.blockType] }}</p>
          <p v-if="b.reason" class="blocking-card__reason">Motivo: {{ b.reason }}</p>
        </div>
        <div class="blocking-card__actions">
          <button
            class="remove-btn"
            :disabled="removing === b.id"
            @click="handleRemove(b.id)"
          >
            {{ removing === b.id ? 'Removendo...' : 'Remover' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.my-blockings-view {
  max-width: 640px;
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
.blocking-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.blocking-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  background: white;
}
.blocking-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}
.blocking-card__info p {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
}
.blocking-card__reason {
  margin-top: 0.25rem !important;
  font-style: italic;
}
.blocking-card__actions {
  display: flex;
  align-items: flex-start;
  padding-top: 0.1rem;
}
.remove-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  color: #c0392b;
  white-space: nowrap;
}
.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
