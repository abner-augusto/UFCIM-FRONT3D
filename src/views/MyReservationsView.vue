<script setup lang="ts">
import { ref, reactive, onMounted, computed, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDownIcon, SlidersHorizontalIcon, XIcon } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import type { Reservation } from '@/types/reservation';
import { TIME_SLOT_LABELS, TIME_SLOT_RANGES, STATUS_LABELS, PURPOSE_OPTIONS } from '@/types/reservation';
import { SPACE_TYPE_LABELS } from '@/types/space';
import type { TimeSlot } from '@/types/reservation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ListItemSkeleton from '@/components/ListItemSkeleton.vue';
import MyReservationsFiltersSheet from '@/components/MyReservationsFiltersSheet.vue';
import StatusBadge, { type StatusBadgeVariant } from '@/components/StatusBadge.vue';
import CancelReservationDialog, {
  type CancelReservationStatus,
  type CancelReservationSummary,
} from '@/components/CancelReservationDialog.vue';
import { formatDateLong, formatDateShort, formatDateTime } from '@/utils/date';
import { blockValue, departmentLabel } from '@/utils/space-labels';
import {
  DEFAULT_MY_RESERVATIONS_FILTERS,
  countActiveFilters,
  describeSeries,
  isReservationPast,
  markCanceled,
  organizeMyReservations,
  reservationDescription,
  reservationSpaceOptions,
  type MyReservationsFilters,
  type ReservationGroup,
  type ReservationStatusFilter,
} from '@/utils/my-reservations';

const route = useRoute();
const auth = useAuthStore();

const STATUS_VARIANT: Record<Reservation['status'] | 'completed' | 'recurrent', StatusBadgeVariant> = {
  confirmed: 'success',
  canceled: 'danger',
  modified: 'warning',
  overridden: 'violet',
  completed: 'muted',
  recurrent: 'info',
};

const reservations = ref<Reservation[]>([]);
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const cancelling = ref<string | null>(null);
const cancellingSeries = ref<string | null>(null);
const expandedId = ref<string | null>(null);
const activeHighlightId = ref<string | null>(null);
const cancelDialogOpen = ref(false);
const cancelTarget = ref<CancelTarget | null>(null);
const cancelStatus = ref<CancelReservationStatus>('idle');
const cancelErrorMessage = ref<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;
let cancelSuccessTimer: ReturnType<typeof setTimeout> | null = null;
// Bumped on every cancel-target change so a slow series-impact response can't
// overwrite the count for a target the user has since switched away from.
let impactRequestSeq = 0;

interface CancelTarget {
  kind: 'single' | 'series';
  id: string;
  summary: CancelReservationSummary;
  futureOccurrencesCount?: number;
}

const PURPOSE_LABELS = Object.fromEntries(PURPOSE_OPTIONS.map(o => [o.value, o.label]));

// ─── Filters (local view state) ─────────────────────────────────────────────
const STATUS_FILTER_OPTIONS: { value: ReservationStatusFilter; label: string }[] = [
  { value: 'active', label: 'Todas, exceto canceladas' },
  { value: 'canceled', label: 'Somente canceladas' },
  { value: 'all', label: 'Todas, inclusive canceladas' },
];
const STATUS_FILTER_CHIP: Record<ReservationStatusFilter, string> = {
  active: '',
  canceled: 'Somente canceladas',
  all: 'Inclusive canceladas',
};

const filters = reactive<MyReservationsFilters>({ ...DEFAULT_MY_RESERVATIONS_FILTERS });
const filtersOpen = ref(false);
// Past reservations stay folded so they never crowd the upcoming ones.
const pastOpen = ref(false);

const spaceOptions = computed(() => reservationSpaceOptions(reservations.value));
const activeFilterCount = computed(() => countActiveFilters(filters));

const organized = computed(() => organizeMyReservations(reservations.value, filters, new Date()));
const visibleCount = computed(() => organized.value.upcoming.length + organized.value.past.length);
// With nothing upcoming (e.g. a period filter in the past), show the past right away.
const pastExpanded = computed(() => pastOpen.value || organized.value.upcoming.length === 0);

interface ReservationSection {
  key: 'upcoming' | 'past';
  title: string;
  groups: ReservationGroup[];
}

const sections = computed<ReservationSection[]>(() => {
  const list: ReservationSection[] = [
    { key: 'upcoming', title: 'Próximas', groups: organized.value.upcoming },
  ];
  if (organized.value.past.length) {
    list.push({ key: 'past', title: 'Anteriores', groups: organized.value.past });
  }
  return list;
});

type FilterKey = 'space' | 'period' | 'status';

const activeChips = computed<{ key: FilterKey; label: string }[]>(() => {
  const chips: { key: FilterKey; label: string }[] = [];
  if (filters.spaceId) {
    const space = spaceOptions.value.find(s => s.value === filters.spaceId);
    chips.push({ key: 'space', label: space?.label ?? 'Espaço' });
  }
  if (filters.from || filters.until) chips.push({ key: 'period', label: periodChipLabel() });
  if (filters.status !== DEFAULT_MY_RESERVATIONS_FILTERS.status) {
    chips.push({ key: 'status', label: STATUS_FILTER_CHIP[filters.status] });
  }
  return chips;
});

function periodChipLabel(): string {
  const from = filters.from ? formatDateShort(filters.from) : null;
  const until = filters.until ? formatDateShort(filters.until) : null;
  if (from && until) return `${from} a ${until}`;
  return from ? `A partir de ${from}` : `Até ${until}`;
}

function clearFilter(key: FilterKey) {
  if (key === 'space') filters.spaceId = null;
  else if (key === 'period') {
    filters.from = null;
    filters.until = null;
  } else filters.status = DEFAULT_MY_RESERVATIONS_FILTERS.status;
}

function clearAllFilters() {
  Object.assign(filters, DEFAULT_MY_RESERVATIONS_FILTERS);
}

function showCanceled() {
  filters.status = 'canceled';
}

onMounted(async () => {
  await loadReservations();
  armHighlightFromQuery();
});

onBeforeUnmount(() => {
  clearHighlightTimer();
  clearCancelSuccessTimer();
});

watch(() => route.query.highlight, () => {
  armHighlightFromQuery();
});

// `silent` refreshes in place (no skeleton) after a cancellation, so the
// cancelled card can leave the list with its exit animation.
async function loadReservations({ silent = false } = {}) {
  if (!silent) {
    loading.value = true;
    errorMsg.value = null;
  }
  try {
    reservations.value = await api.getAllMyReservations(auth.token);
  } catch {
    if (!silent) errorMsg.value = 'Não foi possível carregar suas reservas.';
  } finally {
    loading.value = false;
  }
}

function reservationSpaceName(reservation: Reservation): string {
  return reservation.space?.name ?? reservation.space?.number ?? reservation.spaceId;
}

function reservationSummary(reservation: Reservation, date = dateShort(reservation.date)): CancelReservationSummary {
  return {
    spaceName: reservationSpaceName(reservation),
    dateLabel: date,
    timeLabel: `${reservation.startTime}–${reservation.endTime}`,
  };
}

function futureConfirmedOccurrences(items: Reservation[]): Reservation[] {
  return items.filter(r => r.status === 'confirmed' && !isCompleted(r));
}

function openCancelDialog(reservation: Reservation) {
  impactRequestSeq += 1;
  resetCancelState();
  cancelTarget.value = {
    kind: 'single',
    id: reservation.id,
    summary: reservationSummary(reservation),
  };
  cancelDialogOpen.value = true;
}

function openCancelSeriesDialog(group: ReservationGroup) {
  const requestSeq = (impactRequestSeq += 1);
  const futureOccurrences = futureConfirmedOccurrences(seriesOccurrences(group.id));
  const firstFuture = futureOccurrences[0] ?? group.main;
  resetCancelState();
  cancelTarget.value = {
    kind: 'series',
    id: group.id,
    summary: reservationSummary(firstFuture, `A partir de ${dateShort(firstFuture.date)}`),
    // Client estimate shown instantly; refined below with the backend's count.
    futureOccurrencesCount: futureOccurrences.length,
  };
  cancelDialogOpen.value = true;
  void refreshSeriesImpact(group.id, requestSeq);
}

// Fetch the backend's accurate future-occurrence count and apply it, unless a
// newer cancel target has been opened in the meantime (stale-response guard).
async function refreshSeriesImpact(recurrenceId: string, requestSeq: number) {
  try {
    const impact = await api.getSeriesImpact(auth.token, recurrenceId);
    const target = cancelTarget.value;
    if (requestSeq !== impactRequestSeq || !target || target.kind !== 'series' || target.id !== recurrenceId) {
      return;
    }
    cancelTarget.value = { ...target, futureOccurrencesCount: impact.futureCount };
  } catch {
    // Silently keep the client estimate; never block or surface an error.
  }
}

function closeCancelDialog() {
  if (cancelStatus.value === 'submitting' || cancelStatus.value === 'success') return;
  cancelDialogOpen.value = false;
  cancelTarget.value = null;
  resetCancelState();
}

function handleCancelDialogOpenChange(open: boolean) {
  if (open) {
    cancelDialogOpen.value = true;
    return;
  }
  closeCancelDialog();
}

async function confirmCancellation() {
  const target = cancelTarget.value;
  if (!target || cancelStatus.value === 'submitting' || cancelStatus.value === 'success') return;

  cancelStatus.value = 'submitting';
  cancelErrorMessage.value = null;

  try {
    if (target.kind === 'series') {
      await handleCancelSeries(target.id);
    } else {
      await handleCancel(target.id);
    }
    // Captured now: the backend cancels the future confirmed occurrences, so
    // these are the ones to drop from the list once the dialog closes.
    const canceledIds = target.kind === 'series'
      ? futureConfirmedOccurrences(seriesOccurrences(target.id)).map(r => r.id)
      : [target.id];
    cancelStatus.value = 'success';
    cancelSuccessTimer = setTimeout(() => {
      cancelDialogOpen.value = false;
      cancelTarget.value = null;
      resetCancelState();
      // Leave the list at once (cancelled are hidden by default), then
      // reconcile with the server in the background.
      reservations.value = markCanceled(reservations.value, canceledIds);
      void loadReservations({ silent: true });
    }, 700);
  } catch {
    cancelStatus.value = 'error';
    cancelErrorMessage.value = target.kind === 'series'
      ? 'Não foi possível cancelar a série de reservas. Verifique sua conexão e tente novamente.'
      : 'Não foi possível cancelar a reserva. Verifique sua conexão e tente novamente.';
  }
}

async function handleCancel(id: string) {
  cancelling.value = id;
  try {
    await api.cancelReservation(auth.token, id);
  } finally {
    cancelling.value = null;
  }
}

async function handleCancelSeries(recurrenceId: string) {
  cancellingSeries.value = recurrenceId;
  try {
    await api.cancelReservationSeries(auth.token, recurrenceId);
  } finally {
    cancellingSeries.value = null;
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function clearHighlightTimer() {
  if (!highlightTimer) return;
  clearTimeout(highlightTimer);
  highlightTimer = null;
}

function clearCancelSuccessTimer() {
  if (!cancelSuccessTimer) return;
  clearTimeout(cancelSuccessTimer);
  cancelSuccessTimer = null;
}

function resetCancelState() {
  clearCancelSuccessTimer();
  cancelStatus.value = 'idle';
  cancelErrorMessage.value = null;
}

function getHighlightQuery(): string | null {
  const value = route.query.highlight;
  return typeof value === 'string' && value.trim() ? value : null;
}

function armHighlightFromQuery() {
  const reservationId = getHighlightQuery();
  clearHighlightTimer();

  if (!reservationId || !hasHighlightedReservation(reservationId)) {
    activeHighlightId.value = null;
    return;
  }

  activeHighlightId.value = reservationId;
  if (organized.value.past.some(group => isGroupMatchingHighlight(group, reservationId))) {
    pastOpen.value = true;
  }
  highlightTimer = setTimeout(() => {
    activeHighlightId.value = null;
    highlightTimer = null;
  }, 2500);
}

const dateLabel = formatDateLong;
const dateShort = (iso: string) => formatDateShort(iso, { weekday: true });
const datetimeLabel = formatDateTime;

function periodLabel(startTime: string, endTime: string): string {
  const namedSlot = (Object.entries(TIME_SLOT_RANGES) as [TimeSlot, { startTime: string; endTime: string }][])
    .find(([, r]) => r.startTime === startTime && r.endTime === endTime);
  const range = `${startTime}–${endTime}`;
  return namedSlot ? `${range} (${TIME_SLOT_LABELS[namedSlot[0]]})` : range;
}

function isCompleted(r: Reservation): boolean {
  return isReservationPast(r, new Date());
}

// Every loaded occurrence of a series, ignoring the active filters — series
// cancellation acts on the whole series, not just the dates on screen.
function seriesOccurrences(recurrenceId: string): Reservation[] {
  return reservations.value.filter(r => r.recurrenceId === recurrenceId);
}

function hasFutureOccurrences(group: ReservationGroup): boolean {
  return futureConfirmedOccurrences(seriesOccurrences(group.id)).length > 0;
}

// Single reservations show their own text; a series shows its shared text, or
// none here when occurrences differ (each occurrence then shows its own).
function groupDescription(group: ReservationGroup): string | null {
  return group.isRecurrent ? describeSeries(group.items).shared : reservationDescription(group.main);
}

function allGroups(): ReservationGroup[] {
  return [...organized.value.upcoming, ...organized.value.past];
}

function hasHighlightedReservation(reservationId: string): boolean {
  return allGroups().some(group => isGroupMatchingHighlight(group, reservationId));
}

function isGroupHighlighted(group: ReservationGroup): boolean {
  return !!activeHighlightId.value && isGroupMatchingHighlight(group, activeHighlightId.value);
}

function isGroupMatchingHighlight(group: ReservationGroup, reservationId: string): boolean {
  return group.id === reservationId || group.items.some(r => r.id === reservationId);
}
</script>

<template>
  <div class="my-reservations-view">
    <div class="view-header">
      <h1>Minhas Reservas</h1>
      <Button
        v-if="!loading && !errorMsg && reservations.length"
        variant="outline"
        class="h-11 shrink-0 gap-2"
        data-testid="open-reservation-filters"
        aria-label="Abrir filtros"
        @click="filtersOpen = true"
      >
        <SlidersHorizontalIcon class="size-4" />
        Filtros
        <Badge v-if="activeFilterCount" variant="secondary" class="ml-0.5">{{ activeFilterCount }}</Badge>
      </Button>
    </div>

    <!-- Active filter chips -->
    <div v-if="!loading && activeChips.length" class="mb-4 flex flex-wrap gap-1.5" aria-label="Filtros ativos">
      <Badge
        v-for="chip in activeChips"
        :key="chip.key"
        variant="secondary"
        class="h-7 gap-1 pr-1 pl-2.5 text-[0.78rem]"
        data-testid="active-filter-chip"
      >
        {{ chip.label }}
        <button
          type="button"
          class="hover:bg-foreground/10 focus-visible:ring-ring -mr-0.5 inline-flex size-5 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          :aria-label="`Remover filtro: ${chip.label}`"
          @click="clearFilter(chip.key)"
        >
          <XIcon class="size-3.5" />
        </button>
      </Badge>
    </div>

    <ListItemSkeleton v-if="loading" :count="4" label="Carregando reservas" />
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>
    <div v-else-if="reservations.length === 0" class="state-empty">
      <p>Você ainda não tem nenhuma reserva.</p>
    </div>
    <div v-else-if="visibleCount === 0" class="state-empty">
      <template v-if="activeFilterCount === 0">
        <p>Você não tem reservas ativas no momento.</p>
        <Button variant="ghost" class="mt-2 h-11 text-primary" @click="showCanceled">Ver canceladas</Button>
      </template>
      <template v-else>
        <p>Nenhuma reserva encontrada com os filtros selecionados.</p>
        <Button variant="ghost" class="mt-2 h-11 text-primary" @click="clearAllFilters">Limpar filtros</Button>
      </template>
    </div>

    <template v-else>
    <section
      v-for="section in sections"
      :key="section.key"
      class="reservation-section"
      :aria-labelledby="`section-${section.key}`"
    >
      <button
        v-if="section.key === 'past' && organized.upcoming.length"
        :id="`section-${section.key}`"
        type="button"
        class="section-toggle"
        :aria-expanded="pastExpanded"
        @click="pastOpen = !pastOpen"
      >
        {{ section.title }}
        <span class="section-count">({{ section.groups.length }})</span>
        <ChevronDownIcon class="section-toggle__icon size-4" :class="{ 'section-toggle__icon--open': pastExpanded }" />
      </button>
      <h2 v-else :id="`section-${section.key}`" class="section-title">
        {{ section.title }}
        <span class="section-count">({{ section.groups.length }})</span>
      </h2>

      <p v-if="section.groups.length === 0" class="section-empty">Nenhuma reserva próxima.</p>

    <TransitionGroup
      v-else-if="section.key === 'upcoming' || pastExpanded"
      tag="ul"
      name="rlist"
      class="reservation-list"
    >
      <li
        v-for="(group, i) in section.groups"
        :key="group.id"
        class="reservation-card stagger-item"
        :style="{ '--i': i }"
        :class="{
          'reservation-card--expanded': expandedId === group.id,
          'reservation-card--highlighted': isGroupHighlighted(group),
        }"
      >
        <!-- Summary row — always visible -->
        <button class="reservation-card__summary press-feedback" :aria-expanded="expandedId === group.id" @click="toggleExpand(group.id)">
          <div class="reservation-card__info">
            <h3>{{ group.main.space?.name ?? group.main.space?.number ?? group.main.spaceId }}</h3>
            <p v-if="groupDescription(group)" class="reservation-card__description">{{ groupDescription(group) }}</p>
            <p v-if="!group.isRecurrent">{{ dateLabel(group.main.date) }}</p>
            <p v-else>
              Recorrente: {{ group.items.length }} {{ group.items.length === 1 ? 'ocorrência' : 'ocorrências' }}
              <template v-if="!isCompleted(group.main)"> · próxima em {{ dateShort(group.main.date) }}</template>
            </p>
            <p>{{ periodLabel(group.main.startTime, group.main.endTime) }}</p>
          </div>
          <div class="reservation-card__right">
            <template v-if="!group.isRecurrent">
              <StatusBadge v-if="isCompleted(group.main) && group.main.status === 'confirmed'" :variant="STATUS_VARIANT.completed">
                Concluída
              </StatusBadge>
              <StatusBadge v-else :variant="STATUS_VARIANT[group.main.status]">
                {{ STATUS_LABELS[group.main.status] }}
              </StatusBadge>
            </template>
            <template v-else>
               <StatusBadge :variant="STATUS_VARIANT.recurrent">Série</StatusBadge>
            </template>
            <span class="expand-chevron" :class="{ rotated: expandedId === group.id }">›</span>
          </div>
        </button>

        <!-- Detail panel — same-object reveal (shared .reveal-collapse utility) -->
        <div class="reveal-collapse" :class="{ 'reveal-collapse--open': expandedId === group.id }">
          <div class="reveal-collapse__inner" :inert="expandedId !== group.id">
            <div class="reservation-detail">
          <!-- Space info -->
          <section class="detail-section">
            <p class="detail-section__title">Espaço</p>
            <div class="detail-grid">
              <div v-if="group.main.space?.name" class="detail-item">
                <span class="detail-label">Nome</span>
                <span class="detail-value">{{ group.main.space.name }}</span>
              </div>
              <div v-if="group.main.space?.number" class="detail-item">
                <span class="detail-label">Número</span>
                <span class="detail-value">{{ group.main.space.number }}</span>
              </div>
              <div v-if="group.main.space?.block" class="detail-item">
                <span class="detail-label">Bloco</span>
                <span class="detail-value">{{ blockValue(group.main.space.block) }}</span>
              </div>
              <div v-if="group.main.space?.campus" class="detail-item">
                <span class="detail-label">Campus</span>
                <span class="detail-value">{{ group.main.space.campus }}</span>
              </div>
              <div v-if="group.main.space?.type" class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value">{{ SPACE_TYPE_LABELS[group.main.space.type] ?? group.main.space.type }}</span>
              </div>
              <div v-if="group.main.space?.capacity != null" class="detail-item">
                <span class="detail-label">Capacidade</span>
                <span class="detail-value">{{ group.main.space.capacity }} pessoas</span>
              </div>
              <div v-if="group.main.space?.department" class="detail-item">
                <span class="detail-label">Departamento</span>
                <span class="detail-value">{{ departmentLabel(group.main.space.department) }}</span>
              </div>
            </div>
          </section>

          <!-- Reservation info for single or group -->
          <section class="detail-section">
            <p class="detail-section__title">{{ group.isRecurrent ? 'Série de Reservas' : 'Reserva' }}</p>
            <div class="detail-grid">
              <div v-if="groupDescription(group)" class="detail-item detail-item--stacked">
                <span class="detail-label">Descrição</span>
                <span class="detail-value detail-value--prose">{{ groupDescription(group) }}</span>
              </div>
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">Data</span>
                <span class="detail-value">{{ dateShort(group.main.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Horário</span>
                <span class="detail-value">{{ group.main.startTime }}–{{ group.main.endTime }}</span>
              </div>
              <div v-if="group.main.purpose" class="detail-item">
                <span class="detail-label">Finalidade</span>
                <span class="detail-value">{{ PURPOSE_LABELS[group.main.purpose] ?? group.main.purpose }}</span>
              </div>
              <div v-if="group.isRecurrent" class="detail-item">
                <span class="detail-label">Recorrência ID</span>
                <span class="detail-value detail-value--mono">{{ group.id }}</span>
              </div>
              <div v-if="group.main.changeOrigin" class="detail-item">
                <span class="detail-label">Origem da alteração</span>
                <span class="detail-value">{{ group.main.changeOrigin }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Criada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.createdAt) }}</span>
              </div>
              <div v-if="group.main.updatedAt !== group.main.createdAt" class="detail-item">
                <span class="detail-label">Atualizada em</span>
                <span class="detail-value">{{ datetimeLabel(group.main.updatedAt) }}</span>
              </div>
              <div v-if="!group.isRecurrent" class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value detail-value--mono">{{ group.main.id }}</span>
              </div>
            </div>
          </section>

          <!-- Occurrences for recurrent -->
          <div v-if="group.isRecurrent" class="recurrence-list">
            <p class="detail-section__title" style="margin-top: 1rem">Ocorrências</p>
            <div v-for="r in group.items" :key="r.id" class="recurrence-item">
              <div class="recurrence-info">
                <span class="recurrence-date">{{ dateShort(r.date) }}</span>
                <span
                  v-if="describeSeries(group.items).varies && reservationDescription(r)"
                  class="recurrence-description"
                >{{ reservationDescription(r) }}</span>
              </div>
              <div class="recurrence-actions">
                <StatusBadge v-if="isCompleted(r) && r.status === 'confirmed'" :variant="STATUS_VARIANT.completed">
                  Concluída
                </StatusBadge>
                <StatusBadge v-else :variant="STATUS_VARIANT[r.status]">
                  {{ STATUS_LABELS[r.status] }}
                </StatusBadge>
                <Button v-if="r.status === 'confirmed' && !isCompleted(r)" variant="link" class="text-destructive h-auto p-0 text-xs" @click="openCancelDialog(r)" :disabled="cancelling === r.id || cancellingSeries === group.id">
                  {{ cancelling === r.id ? '...' : 'Cancelar' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Cancellation reason for single -->
          <div v-if="!group.isRecurrent && group.main.status === 'canceled' && group.main.cancelReason" class="detail-cancel-reason">
            <p class="detail-cancel-reason__label">Motivo do cancelamento</p>
            <p class="detail-cancel-reason__text">{{ group.main.cancelReason }}</p>
          </div>

          <!-- Actions -->
          <div class="detail-actions" style="margin-top: 1rem">
            <Button
              v-if="!group.isRecurrent && group.main.status === 'confirmed' && !isCompleted(group.main)"
              variant="outline"
              class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="cancelling === group.main.id"
              @click="openCancelDialog(group.main)"
            >
              {{ cancelling === group.main.id ? 'Cancelando...' : 'Cancelar reserva' }}
            </Button>

            <Button
              v-if="group.isRecurrent && hasFutureOccurrences(group)"
              variant="outline"
              class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
              :disabled="cancellingSeries === group.id"
              @click="openCancelSeriesDialog(group)"
            >
              {{ cancellingSeries === group.id ? 'Cancelando...' : 'Cancelar todas as datas futuras' }}
            </Button>
          </div>

            </div>
          </div>
        </div>
      </li>
    </TransitionGroup>
    </section>
    </template>

    <MyReservationsFiltersSheet
      v-model:open="filtersOpen"
      v-model:space-id="filters.spaceId"
      v-model:from="filters.from"
      v-model:until="filters.until"
      v-model:status="filters.status"
      :space-options="spaceOptions"
      :status-options="STATUS_FILTER_OPTIONS"
      :active-count="activeFilterCount"
      @clear="clearAllFilters"
    />

    <CancelReservationDialog
      :open="cancelDialogOpen"
      :summary="cancelTarget?.summary ?? null"
      :future-occurrences-count="cancelTarget?.futureOccurrencesCount ?? null"
      :status="cancelStatus"
      :error-message="cancelErrorMessage"
      @update:open="handleCancelDialogOpenChange"
      @confirm="confirmCancellation"
      @keep="closeCancelDialog"
    />
  </div>
</template>

<style scoped>
.my-reservations-view {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  min-height: 2.75rem;
}
h1 {
  margin: 0;
  font-size: 1.3rem;
}

/* Sections: "Próximas" always open, "Anteriores" folded behind a toggle. */
.reservation-section + .reservation-section {
  margin-top: 1.75rem;
}
.section-title,
.section-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.section-toggle {
  min-height: var(--tap-min, 44px);
  width: 100%;
  margin-bottom: 0.2rem;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.section-toggle:hover {
  color: var(--foreground);
}
.section-toggle:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 6px;
}
.section-toggle__icon {
  margin-left: auto;
  transition: transform 0.2s ease;
}
.section-toggle__icon--open {
  transform: rotate(180deg);
}
.section-count {
  font-weight: 400;
}
.section-empty {
  margin: 0;
  padding: 0.75rem 0;
  color: var(--muted-foreground);
  font-size: 0.9rem;
}

@media (prefers-reduced-motion: reduce) {
  .section-toggle__icon {
    transition: none;
  }
}
.reservation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative; /* anchor for a leaving card's absolute position (FLIP) */
}

/* FLIP: when a card expands or one is removed, the others glide to their new
   spot instead of snapping. Entrance is handled by `.stagger-item`. */
.rlist-move {
  transition: transform 300ms var(--ease-out-quart, ease);
}
.rlist-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
  position: absolute;
  left: 0;
  right: 0;
}
.rlist-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Card */
.reservation-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  overflow: hidden;
  transition: border-color 0.15s, background-color var(--duration-med, 220ms) ease, box-shadow var(--duration-med, 220ms) ease;
}
.reservation-card--expanded {
  border-color: var(--primary);
}
.reservation-card--highlighted {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 18%, var(--card));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 35%, transparent);
}

/* Summary row */
.reservation-card__summary {
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
.reservation-card__summary:hover {
  background: var(--accent);
}

.reservation-card__info {
  min-width: 0;
}
.reservation-card__info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reservation-card__info p {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.85rem;
  line-height: 1.5;
}
/* What the booking is for — clamped in the summary, full text in the detail. */
.reservation-card__info p.reservation-card__description {
  margin: 0 0 0.2rem;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.reservation-card__right {
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

/* Status badges */
/* Detail panel — reveal motion handled by the shared .reveal-collapse utility (motion.css) */
.reservation-detail {
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

/* Free text reads left-aligned under its label, wrapping like prose. */
.detail-item--stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}
.detail-value--prose {
  text-align: left;
  font-weight: 400;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: normal;
}

.detail-value--mono {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* Cancellation reason */
.detail-cancel-reason {
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  background: var(--danger-surface);
  border: 1px solid var(--danger-border);
}
.detail-cancel-reason__label {
  margin: 0 0 0.2rem;
  color: var(--danger-fg);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.detail-cancel-reason__text {
  margin: 0;
  color: var(--danger-fg);
  font-size: 0.84rem;
}

/* Recurrence List */
.recurrence-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.recurrence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}
.recurrence-item:last-child {
  border-bottom: none;
}
.recurrence-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}
.recurrence-date {
  color: var(--foreground);
}
.recurrence-description {
  color: var(--muted-foreground);
  font-size: 0.8rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.recurrence-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
