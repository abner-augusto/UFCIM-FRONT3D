<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api, ApiError } from '@/services/api';
import type { EquipmentReport } from '@/types/equipment-report';
import { REPORT_STATUS_LABELS } from '@/types/equipment-report';
import { hasRole, CAN_MANAGE_EQUIPMENT } from '@/utils/roles';

const router = useRouter();
const auth = useAuthStore();

type StatusFilter = EquipmentReport['status'];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'acknowledged', label: 'Em análise' },
  { value: 'resolved', label: 'Resolvidos' },
  { value: 'dismissed', label: 'Descartados' },
];

const SEVERITY_SHORT: Record<EquipmentReport['severity'], string> = {
  minor: 'Leve',
  major: 'Importante',
  blocking: 'Crítico',
};

const activeStatus = ref<StatusFilter>('pending');
const reports = ref<EquipmentReport[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const acting = ref<string | null>(null);

onMounted(async () => {
  if (!hasRole(auth.userRole, CAN_MANAGE_EQUIPMENT)) {
    router.replace({ name: 'campus-select' });
    return;
  }
  await loadReports();
});

async function loadReports() {
  loading.value = true;
  errorMsg.value = null;
  try {
    reports.value = await api.listPendingEquipmentReports(auth.token, {
      status: activeStatus.value,
    });
  } catch {
    errorMsg.value = 'Não foi possível carregar os reportes.';
  } finally {
    loading.value = false;
  }
}

async function selectStatus(status: StatusFilter) {
  if (status === activeStatus.value) return;
  activeStatus.value = status;
  await loadReports();
}

async function handleAcknowledge(report: EquipmentReport) {
  acting.value = report.id;
  try {
    await api.acknowledgeEquipmentReport(auth.token, report.id);
    await loadReports();
  } catch {
    errorMsg.value = 'Não foi possível atualizar o reporte.';
  } finally {
    acting.value = null;
  }
}

async function handleResolve(report: EquipmentReport) {
  acting.value = report.id;
  try {
    await api.resolveEquipmentReport(auth.token, report.id);
    await loadReports();
  } catch {
    errorMsg.value = 'Não foi possível resolver o reporte.';
  } finally {
    acting.value = null;
  }
}

async function handleDismiss(report: EquipmentReport) {
  const reason = window.prompt('Motivo para descartar este reporte:');
  if (reason === null) return;
  if (reason.trim().length < 3) {
    errorMsg.value = 'O motivo deve ter pelo menos 3 caracteres.';
    return;
  }
  acting.value = report.id;
  try {
    await api.dismissEquipmentReport(auth.token, report.id, reason.trim());
    await loadReports();
  } catch (e) {
    errorMsg.value =
      e instanceof ApiError && e.message
        ? e.message
        : 'Não foi possível descartar o reporte.';
  } finally {
    acting.value = null;
  }
}

const isEmpty = computed(() => !loading.value && !errorMsg.value && reports.value.length === 0);

const datetimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function spaceLabel(report: EquipmentReport): string {
  const space = report.equipment?.space;
  if (!space) return '—';
  return space.name || `Sala ${space.number}`;
}
</script>

<template>
  <div class="maint-reports-view">
    <div class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Reportes de Equipamentos</h1>
    </div>

    <div class="status-tabs" role="tablist">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        type="button"
        class="status-tab"
        :class="{ 'status-tab--active': activeStatus === tab.value }"
        role="tab"
        :aria-selected="activeStatus === tab.value"
        @click="selectStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="state-msg">Carregando reportes...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="isEmpty" class="state-empty">
      <p>Nenhum reporte {{ REPORT_STATUS_LABELS[activeStatus].toLowerCase() }}.</p>
    </div>

    <ul v-else class="report-list">
      <li v-for="r in reports" :key="r.id" class="report-card">
        <div class="report-card__head">
          <span class="severity-badge" :class="`severity-badge--${r.severity}`">
            {{ SEVERITY_SHORT[r.severity] }}
          </span>
          <span class="status-badge" :class="`status-badge--${r.status}`">
            {{ REPORT_STATUS_LABELS[r.status] }}
          </span>
        </div>

        <h3 class="report-card__title">
          {{ r.equipment?.name ?? 'Equipamento' }}
          <span class="report-card__space">· {{ spaceLabel(r) }}</span>
        </h3>

        <p class="report-card__desc">{{ r.description }}</p>

        <div class="report-card__meta">
          <span v-if="r.reporter">Reportado por {{ r.reporter.name }}</span>
          <span>{{ datetimeLabel(r.createdAt) }}</span>
        </div>

        <p v-if="r.status === 'dismissed' && r.dismissedReason" class="report-card__reason">
          <span class="report-card__reason-label">Motivo do descarte:</span>
          {{ r.dismissedReason }}
        </p>

        <div
          v-if="r.status === 'pending' || r.status === 'acknowledged'"
          class="report-card__actions"
        >
          <button
            v-if="r.status === 'pending'"
            class="action-btn action-btn--neutral"
            :disabled="acting === r.id"
            @click="handleAcknowledge(r)"
          >
            Marcar em análise
          </button>
          <button
            class="action-btn action-btn--resolve"
            :disabled="acting === r.id"
            @click="handleResolve(r)"
          >
            Resolver
          </button>
          <button
            class="action-btn action-btn--dismiss"
            :disabled="acting === r.id"
            @click="handleDismiss(r)"
          >
            Descartar
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.maint-reports-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
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

/* Status tabs */
.status-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.status-tab {
  flex-shrink: 0;
  padding: 0.4rem 0.85rem;
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  background: white;
  color: #666;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.status-tab:hover {
  background: #f9fafb;
}
.status-tab--active {
  background: var(--color-brand-soft, #e6f6ef);
  border-color: var(--color-brand, #1D9E75);
  color: var(--color-brand, #1D9E75);
}

/* List */
.report-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.report-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  background: white;
  padding: 1rem 1.25rem;
}

.report-card__head {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.severity-badge,
.status-badge {
  font-size: 0.72rem;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}
.severity-badge--minor { background: #fef9e7; color: #7d6608; }
.severity-badge--major { background: #fdf2f2; color: #922b21; }
.severity-badge--blocking { background: #fce4ec; color: #7b241c; }

.status-badge--pending { background: #fff4e5; color: #9a5b00; }
.status-badge--acknowledged { background: #e7f0ff; color: #1e40af; }
.status-badge--resolved { background: #e7f7ef; color: #1D7A5A; }
.status-badge--dismissed { background: #f0f0f0; color: #777; }

.report-card__title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111;
}
.report-card__space {
  font-weight: 400;
  color: #777;
  font-size: 0.9rem;
}

.report-card__desc {
  margin: 0 0 0.6rem;
  font-size: 0.88rem;
  color: #444;
  line-height: 1.5;
  white-space: pre-wrap;
}

.report-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  font-size: 0.76rem;
  color: #999;
}

.report-card__reason {
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
  color: #666;
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
}
.report-card__reason-label {
  font-weight: 600;
  color: #555;
}

/* Actions */
.report-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
.action-btn {
  font-size: 0.82rem;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid;
  background: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-btn--neutral { border-color: #c7c7c7; color: #555; }
.action-btn--neutral:hover:not(:disabled) { background: #f5f5f5; }
.action-btn--resolve { border-color: #1D9E75; color: #1D7A5A; }
.action-btn--resolve:hover:not(:disabled) { background: #eafaf3; }
.action-btn--dismiss { border-color: #c0392b; color: #c0392b; }
.action-btn--dismiss:hover:not(:disabled) { background: #fff0f0; }

/* States */
.state-msg { color: #888; font-size: 0.9rem; }
.state-error { color: #c0392b; font-size: 0.9rem; }
.state-empty { color: #888; font-size: 0.9rem; text-align: center; padding: 3rem 0; }
</style>
