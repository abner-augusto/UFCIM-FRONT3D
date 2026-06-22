<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useViewerSync } from '@/composables/useViewerSync';
import { PERIOD_LABELS, type PeriodKey } from '@/utils/period';
import { formatShortDate, createDateChips } from '@/composables/useDateTimeFilter';
import { toLocalISODate } from '@/utils/date';
import { Building2, Search, Maximize, Calendar } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

interface Building {
  id: string;
  name: string;
}

interface Floor {
  level: number;
  name: string;
}

interface ThreeViewerExposed {
  selectBuilding: (id: string | null) => void;
  selectFloor: (level: number) => void;
  getBuildingsList: () => Building[];
  getFloorsForBuilding: (id: string) => Floor[];
  getActiveBuildingId: () => string | null;
  getActiveFloorLevel: () => number | null;
  setFullscreen: (on: boolean) => void;
  updatePinLabelStatus?: (pinId: string, statusText: string | null, statusColor: string | null) => void;
}

const props = defineProps<{
  viewerRef: ThreeViewerExposed | null;
  ready: boolean;
  selectedDate: string;
  selectedPeriod: PeriodKey;
  periodAutoDetected: boolean;
  fullscreen: boolean;
}>();

const emit = defineEmits<{
  'update:selectedDate': [date: string];
  'update:selectedPeriod': [period: PeriodKey];
  'update:fullscreen': [on: boolean];
  'open-search': [];
}>();

const isToday = computed(() => props.selectedDate === toLocalISODate());

const { activeBuildingId, activeFloorLevel, buildings, floors } = useViewerSync(
  () => props.viewerRef,
  () => props.ready,
);
const dateTimePopoverOpen = ref(false);
const buildingPopoverOpen = ref(false);

const PERIODS: { key: PeriodKey; label: string; range: string }[] = [
  { key: 'morning', label: 'Manhã', range: '07h–12h' },
  { key: 'afternoon', label: 'Tarde', range: '13h–18h' },
  { key: 'evening', label: 'Noite', range: '19h–22h' },
];

const floorsReversed = computed(() => {
  return [...floors.value].sort((a, b) => b.level - a.level);
});

const buildingName = computed(() => {
  if (!activeBuildingId.value) return 'Todos';
  const b = buildings.value.find(b => b.id === activeBuildingId.value);
  return b ? b.name : activeBuildingId.value;
});

const floorName = computed(() => {
  if (activeFloorLevel.value === null) return null;
  const f = floors.value.find(f => f.level === activeFloorLevel.value);
  return f ? f.name : null;
});

const periodLabel = computed(() => PERIOD_LABELS[props.selectedPeriod]);

const dateTimeBtnLabel = computed(() => {
  const dayLabel = isToday.value ? 'Hoje' : formatShortDate(props.selectedDate);
  const periodAbbr = PERIOD_LABELS[props.selectedPeriod];
  return `${dayLabel} · ${periodAbbr}`;
});

const dateChips = computed(() => createDateChips());

const ariaLabel = computed(() => {
  let label = `${dateTimeBtnLabel.value}, Edifício: ${buildingName.value}`;
  if (floorName.value) label += `, Pavimento: ${floorName.value}`;
  return label;
});

function shortFloorLabel(name: string): string {
  if (name === 'Térreo') return 'T';
  const digitMatch = name.match(/^(\d+)º/);
  if (digitMatch) return digitMatch[1];
  if (name === 'Subsolo') return '-1';
  return name.substring(0, 2);
}

function toggleDateTime() {
  dateTimePopoverOpen.value = !dateTimePopoverOpen.value;
  buildingPopoverOpen.value = false;
}

function toggleBuilding() {
  buildingPopoverOpen.value = !buildingPopoverOpen.value;
  dateTimePopoverOpen.value = false;
}

// Hidden native date input, kept in the DOM so showPicker() works.
const hiddenDateRef = ref<HTMLInputElement | null>(null);

function openDatePicker() {
  const input = hiddenDateRef.value;
  if (!input) return;
  input.value = props.selectedDate;
  // showPicker() is the reliable way to open the native calendar from a
  // user gesture; fall back to focus()/click() where it's unsupported.
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // showPicker can throw (e.g. not triggered by a user gesture) — fall through
    }
  }
  input.focus();
  input.click();
}

function onHiddenDateChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  if (value) {
    emit('update:selectedDate', value);
    dateTimePopoverOpen.value = false;
  }
}

function onDatePick(date: string) {
  emit('update:selectedDate', date);
}

function onPeriodPick(period: PeriodKey) {
  emit('update:selectedPeriod', period);
  dateTimePopoverOpen.value = false;
}

function onBuildingPick(id: string | null) {
  props.viewerRef?.selectBuilding(id);
  buildingPopoverOpen.value = false;
}

function onFloorPick(level: number) {
  props.viewerRef?.selectFloor(level);
}

function closeDateTime() {
  dateTimePopoverOpen.value = false;
}

function closeBuilding() {
  buildingPopoverOpen.value = false;
}

// Click outside logic
const dateTimeRef = ref<HTMLElement | null>(null);
const buildingRef = ref<HTMLElement | null>(null);

function handleDocumentClick(e: MouseEvent) {
  if (dateTimePopoverOpen.value && dateTimeRef.value && !dateTimeRef.value.contains(e.target as Node)) {
    closeDateTime();
  }
  if (buildingPopoverOpen.value && buildingRef.value && !buildingRef.value.contains(e.target as Node)) {
    closeBuilding();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentClick);
});
</script>

<template>
  <div class="rail-root">
    <!-- top stack: datetime, building, search -->
    <div class="rail-stack rail-stack--top">
      <Button variant="ghost" class="rail-btn rail-btn--wide" :class="{ active: dateTimePopoverOpen }" @click="toggleDateTime" :title="dateTimeBtnLabel">
        <span class="rail-btn-label">{{ dateTimeBtnLabel }}</span>
      </Button>
      <Button variant="ghost" size="icon" class="rail-btn" :class="{ active: buildingPopoverOpen }" @click="toggleBuilding" title="Edifício"><Building2 :size="20" /></Button>
      <Button variant="ghost" size="icon" class="rail-btn" @click="$emit('open-search')" title="Pesquisar"><Search :size="20" /></Button>
    </div>

    <!-- floor stack: only when a building is selected -->
    <Transition name="floor-stack">
      <div v-if="activeBuildingId" class="floor-stack">
        <Button v-for="f in floorsReversed" :key="f.level"
                variant="ghost"
                class="floor-btn"
                :class="{ active: f.level === activeFloorLevel }"
                @click="onFloorPick(f.level)">
          {{ shortFloorLabel(f.name) }}
        </Button>
      </div>
    </Transition>

    <!-- bottom: fullscreen toggle -->
    <div class="rail-stack rail-stack--bottom">
      <Button variant="ghost" size="icon" class="rail-btn" :class="{ active: fullscreen }"
              @click="$emit('update:fullscreen', !fullscreen)" title="Tela cheia"><Maximize :size="20" /></Button>
    </div>

    <!-- breadcrumb pill -->
    <div class="breadcrumb-pill" :aria-label="ariaLabel">
      <Button variant="ghost" class="crumb crumb--strong" @click="toggleDateTime">{{ isToday ? 'Hoje' : formatShortDate(selectedDate) }}</Button>
      <span class="dot">·</span>
      <span class="crumb crumb--passive">{{ periodLabel }}</span>
      <template v-if="activeBuildingId">
        <span class="dot">·</span>
        <Button variant="ghost" class="crumb" @click="toggleBuilding">{{ buildingName }}</Button>
      </template>
      <template v-if="floorName">
        <span class="dot">·</span>
        <span class="crumb crumb--passive">{{ floorName }}</span>
      </template>
    </div>

    <!-- datetime popover -->
    <Transition name="popover">
      <div v-if="dateTimePopoverOpen" ref="dateTimeRef" class="popover popover--datetime">
        <div class="popover-section">
          <div class="popover-label">
            <span>Data</span>
          </div>
          <div class="popover-date-chips">
            <Button
              v-for="d in dateChips" :key="d.value"
              type="button"
              variant="ghost"
              class="popover-item popover-item--chip"
              :class="{ active: d.value === selectedDate }"
              @click="onDatePick(d.value)"
            >{{ d.label }}</Button>
          </div>
          <Button type="button" variant="ghost" class="popover-item popover-item--full" @click="openDatePicker">
            <Calendar :size="14" style="vertical-align: -2px" /> Escolher outra data
          </Button>
          <input
            ref="hiddenDateRef"
            type="date"
            class="hidden-date-input"
            min="2024-01-01"
            @change="onHiddenDateChange"
          />
        </div>

        <div class="popover-divider"></div>

        <div class="popover-section">
          <div class="popover-label">
            <span>Período</span>
            <span v-if="periodAutoDetected" class="popover-auto-tag">automático</span>
          </div>
          <Button v-for="p in PERIODS" :key="p.key"
                  type="button"
                  variant="ghost"
                  class="popover-item"
                  :class="{ active: p.key === selectedPeriod }"
                  @click="onPeriodPick(p.key)">{{ p.label }} · {{ p.range }}</Button>
        </div>
      </div>
    </Transition>

    <!-- building popover -->
    <Transition name="popover">
      <div v-if="buildingPopoverOpen" ref="buildingRef" class="popover popover--building">
        <div class="popover-grid">
          <Button type="button" variant="ghost" class="popover-item" :class="{ active: !activeBuildingId }" @click="onBuildingPick(null)">Todos</Button>
          <Button v-for="b in buildings" :key="b.id"
                  type="button"
                  variant="ghost"
                  class="popover-item"
                  :class="{ active: b.id === activeBuildingId }"
                  @click="onBuildingPick(b.id)">{{ b.name }}</Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.rail-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-chrome);
  transform: translate3d(0, 0, 0);
}

@media (min-width: 481px) {
  .rail-root {
    display: none;
  }
}

.rail-stack {
  position: absolute;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--rail-gap);
  pointer-events: auto;
}

.rail-stack--top {
  top: 8px;
}

.rail-stack--bottom {
  bottom: 8px;
}

.rail-btn {
  width: var(--rail-w);
  height: var(--rail-w);
  background: var(--popover);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 20px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.rail-btn--wide {
  width: auto;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.rail-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-btn.active {
  background: var(--color-brand);
  color: white;
}

.floor-stack {
  position: absolute;
  right: calc(8px + var(--rail-w) + var(--rail-gap));
  top: calc(8px + var(--rail-w) + var(--rail-gap));
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
}

.floor-btn {
  width: 36px;
  height: 36px;
  background: var(--popover);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.floor-btn.active {
  background: var(--color-brand);
  color: white;
}

.breadcrumb-pill {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: color-mix(in oklab, var(--popover) 94%, transparent);
  padding: 6px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.crumb {
  padding: 0;
  font-size: 0.78rem;
  color: var(--foreground);
  height: auto;
  min-height: 0;
}

.crumb--strong {
  font-weight: 600;
}

.crumb--passive {
  cursor: default;
}

.dot {
  color: #ccc;
  font-weight: bold;
}

.popover {
  position: absolute;
  background: var(--popover);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 8px;
  pointer-events: auto;
  z-index: var(--z-popover);
}

.popover--datetime {
  top: 8px;
  right: calc(16px + var(--rail-w));
  width: 175px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.popover--building {
  top: calc(8px + var(--rail-w) + var(--rail-gap));
  right: calc(16px + var(--rail-w));
  width: 180px;
}

.popover-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popover-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #999;
  padding: 2px 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popover-auto-tag {
  font-size: 0.6rem;
  font-weight: 400;
  text-transform: none;
  padding: 1px 6px;
  background: #e8f5f0;
  color: #1D9E75;
  border-radius: 999px;
}

.popover-divider {
  height: 1px;
  background: #eee;
  margin: 6px -4px;
}

.popover-date-chips {
  display: flex;
  gap: 4px;
}

.popover-item {
  padding: 10px;
  background: var(--muted);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
  height: auto;
  min-height: var(--tap-min);
}

.popover-item--chip {
  flex: 1;
  font-size: 0.78rem;
}

.popover-item--full {
  text-align: left;
  font-size: 0.78rem;
  color: var(--muted-foreground);
}

/* Kept in the DOM (not display:none) so showPicker() can anchor and open. */
.hidden-date-input {
  position: absolute;
  bottom: 8px;
  left: 8px;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.popover-item.active {
  background: var(--color-brand);
  color: white;
}

.popover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* Animations */
.floor-stack-enter-active,
.floor-stack-leave-active {
  transition: all 0.2s ease-out;
}
.floor-stack-enter-from,
.floor-stack-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.95) translateX(10px);
}
</style>
