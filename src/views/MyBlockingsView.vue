<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Blocking } from '@/types/reservation';
import { BLOCK_TYPE_LABELS } from '@/types/reservation';
import { usePermissions } from '@/composables/usePermissions';
import { Button } from '@/components/ui/button';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';

const router = useRouter();
const auth = useAuthStore();
const { canBlock } = usePermissions();

const blockings = ref<Blocking[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const removing = ref<string | null>(null);
const expandedId = ref<string | null>(null);

onMounted(async () => {
  if (!canBlock.value) {
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

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

const dateShort = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const dateLong = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const datetimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
</script>

<template>
  <div class="my-blockings-view">
    <div class="view-header">
      <Button variant="ghost" class="text-primary px-0" @click="router.back()">← Voltar</Button>
      <h1>Meus Bloqueios</h1>
    </div>

    <ListItemSkeleton v-if="loading" :count="4" label="Carregando bloqueios" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="blockings.length === 0" class="state-empty">
      <p>Você não tem bloqueios ativos.</p>
    </div>

    <TransitionGroup v-else tag="ul" name="blist" class="blocking-list">
      <li
        v-for="(b, i) in blockings"
        :key="b.id"
        class="blocking-card stagger-item"
        :style="{ '--i': i }"
        :class="{ 'blocking-card--expanded': expandedId === b.id }"
      >
        <!-- Summary row -->
        <button class="blocking-card__summary press-feedback" :aria-expanded="expandedId === b.id" @click="toggleExpand(b.id)">
          <div class="blocking-card__info">
            <h3>{{ b.space?.name ?? b.space?.number ?? b.spaceId }}</h3>
            <p>{{ dateLong(b.date) }}</p>
            <p>{{ b.startTime }}–{{ b.endTime }} · {{ BLOCK_TYPE_LABELS[b.blockType] }}</p>
          </div>
          <div class="blocking-card__right">
            <span class="type-badge" :class="`type-badge--${b.blockType}`">
              {{ BLOCK_TYPE_LABELS[b.blockType] }}
            </span>
            <span class="expand-chevron" :class="{ rotated: expandedId === b.id }">›</span>
          </div>
        </button>

        <!-- Detail panel — same-object reveal (shared .reveal-collapse utility) -->
        <div class="reveal-collapse" :class="{ 'reveal-collapse--open': expandedId === b.id }">
          <div class="reveal-collapse__inner" :inert="expandedId !== b.id">
            <div class="blocking-detail">
          <!-- Space section -->
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="b.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ b.space.name }}</span>
              </div>
              <div v-if="b.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ b.space.number }}</span>
              </div>
              <div v-if="b.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ b.space.block }}</span>
              </div>
              <div v-if="b.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ b.space.campus }}</span>
              </div>
            </div>
          </section>

          <!-- Blocking section -->
          <section class="detail-section">
            <p class="detail-section__title">Bloqueio</p>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ dateShort(b.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ b.startTime }}–{{ b.endTime }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ BLOCK_TYPE_LABELS[b.blockType] }}</span>
              </div>
              <div v-if="b.reason" class="detail-item">
                <span class="detail-label">Motivo</span>
                <span class="detail-value">{{ b.reason }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criado em</span>
                <span class="detail-value">{{ datetimeLabel(b.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ b.id }}</span>
              </div>
            </div>
          </section>

          <!-- Remove action -->
          <div class="detail-actions">
            <Button
              variant="outline"
              class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="removing === b.id"
              @click="handleRemove(b.id)"
            >
              {{ removing === b.id ? 'Removendo...' : 'Remover bloqueio' }}
            </Button>
          </div>
            </div>
          </div>
        </div>
      </li>
    </TransitionGroup>
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
.blocking-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative; /* anchor for a leaving card's absolute position (FLIP) */
}

/* FLIP: siblings glide when a card expands or one is removed. Entrance is
   handled by `.stagger-item`. */
.blist-move {
  transition: transform 300ms var(--ease-out-quart, ease);
}
.blist-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
  position: absolute;
  left: 0;
  right: 0;
}
.blist-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Card */
.blocking-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  overflow: hidden;
  transition: border-color 0.15s;
}
.blocking-card--expanded {
  border-color: var(--primary);
}

/* Summary row */
.blocking-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  padding: 1rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  gap: 0.75rem;
}
.blocking-card__summary:hover {
  background: var(--accent);
}

.blocking-card__info {
  min-width: 0;
}
.blocking-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.blocking-card__info p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.85rem;
  line-height: 1.5;
}

.blocking-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* Chevron */
.expand-chevron {
  font-size: 1.1rem;
  color: var(--muted-foreground);
  line-height: 1;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
  display: inline-block;
}
.expand-chevron.rotated {
  transform: rotate(-90deg);
}

/* Type badges */
.type-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}
.type-badge--administrative { background: var(--info-surface); color: var(--info); }
.type-badge--maintenance    { background: var(--warning-surface); color: var(--warning); }

/* Detail panel — reveal motion handled by the shared .reveal-collapse utility (motion.css) */
.blocking-detail {
  border-top: 1px solid var(--border);
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-section__title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin: 0 0 0.6rem;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.84rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3rem;
  gap: 0.5rem;
}
.detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

@media (max-width: 480px) {
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }
}

.detail-label {
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.detail-value {
  font-weight: 500;
  color: var(--foreground);
  text-align: right;
  word-break: break-all;
}

@media (max-width: 480px) {
  .detail-value {
    text-align: left;
    word-break: break-word;
  }
}

.detail-value--mono {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* Actions */
.detail-actions {
  padding-top: 0.25rem;
}

/* States */
.state-msg { color: var(--muted-foreground); font-size: 0.9rem; }
.state-error { color: var(--destructive); font-size: 0.9rem; }
.state-empty { color: var(--muted-foreground); font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
