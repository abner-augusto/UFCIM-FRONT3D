<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { PERIOD_LABELS, type PeriodKey } from '@/utils/period';

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
}

const props = defineProps<{
  viewerRef: ThreeViewerExposed | null;
  ready: boolean;
  modelValue: PeriodKey;
  fullscreen: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [period: PeriodKey];
  'update:fullscreen': [on: boolean];
  'open-search': [];
}>();

const activeBuildingId = ref<string | null>(null);
const activeFloorLevel = ref<number | null>(null);
const periodPopoverOpen = ref(false);
const buildingPopoverOpen = ref(false);
const buildings = ref<Building[]>([]);

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'morning', label: 'Manhã' },
  { key: 'afternoon', label: 'Tarde' },
  { key: 'evening', label: 'Noite' },
];

const floors = computed(() => {
  if (!activeBuildingId.value || !props.viewerRef) return [];
  return props.viewerRef.getFloorsForBuilding(activeBuildingId.value);
});

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

const periodLabel = computed(() => PERIOD_LABELS[props.modelValue]);

const ariaLabel = computed(() => {
  let label = `Período: ${periodLabel.value}, Edifício: ${buildingName.value}`;
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

function togglePeriod() {
  periodPopoverOpen.value = !periodPopoverOpen.value;
  buildingPopoverOpen.value = false;
}

function toggleBuilding() {
  buildingPopoverOpen.value = !buildingPopoverOpen.value;
  periodPopoverOpen.value = false;
}

function onPeriodPick(period: PeriodKey) {
  emit('update:modelValue', period);
  periodPopoverOpen.value = false;
}

function onBuildingPick(id: string | null) {
  props.viewerRef?.selectBuilding(id);
  buildingPopoverOpen.value = false;
}

function onFloorPick(level: number) {
  props.viewerRef?.selectFloor(level);
}

function closePeriod() {
  periodPopoverOpen.value = false;
}

function closeBuilding() {
  buildingPopoverOpen.value = false;
}

// Click outside logic
const periodRef = ref<HTMLElement | null>(null);
const buildingRef = ref<HTMLElement | null>(null);

function handleDocumentClick(e: MouseEvent) {
  if (periodPopoverOpen.value && periodRef.value && !periodRef.value.contains(e.target as Node)) {
    closePeriod();
  }
  if (buildingPopoverOpen.value && buildingRef.value && !buildingRef.value.contains(e.target as Node)) {
    closeBuilding();
  }
}

function syncState() {
  if (!props.viewerRef || !props.ready) return;
  activeBuildingId.value = props.viewerRef.getActiveBuildingId();
  activeFloorLevel.value = props.viewerRef.getActiveFloorLevel();
  if (buildings.value.length === 0) {
    buildings.value = props.viewerRef.getBuildingsList();
  }
}

const onBuildingChanged = (e: Event) => {
  const detail = (e as CustomEvent).detail;
  activeBuildingId.value = detail.buildingID;
  activeFloorLevel.value = detail.activeFloor;
};

const onFloorChanged = (e: Event) => {
  const detail = (e as CustomEvent).detail;
  activeFloorLevel.value = detail.level;
};

onMounted(() => {
  window.addEventListener('ufcim:building-changed', onBuildingChanged);
  window.addEventListener('ufcim:floor-changed', onFloorChanged);
  document.addEventListener('mousedown', handleDocumentClick);
  
  if (props.ready) {
    syncState();
  }
});

onUnmounted(() => {
  window.removeEventListener('ufcim:building-changed', onBuildingChanged);
  window.removeEventListener('ufcim:floor-changed', onFloorChanged);
  document.removeEventListener('mousedown', handleDocumentClick);
});

watch(() => props.ready, (isReady) => {
  if (isReady) syncState();
}, { immediate: true });

watch(() => props.viewerRef, (newRef) => {
  if (newRef && props.ready) syncState();
}, { immediate: true });

</script>

<template>
  <div class="rail-root">
    <!-- top stack: period, building, search -->
    <div class="rail-stack rail-stack--top">
      <button class="rail-btn" :class="{ active: periodPopoverOpen }" @click="togglePeriod" title="Período">🕐</button>
      <button class="rail-btn" :class="{ active: buildingPopoverOpen }" @click="toggleBuilding" title="Edifício">🏛</button>
      <button class="rail-btn" @click="$emit('open-search')" title="Pesquisar">🔍</button>
    </div>

    <!-- floor stack: only when a building is selected -->
    <Transition name="floor-stack">
      <div v-if="activeBuildingId" class="floor-stack">
        <button v-for="f in floorsReversed" :key="f.level"
                class="floor-btn"
                :class="{ active: f.level === activeFloorLevel }"
                @click="onFloorPick(f.level)">
          {{ shortFloorLabel(f.name) }}
        </button>
      </div>
    </Transition>

    <!-- bottom: fullscreen toggle -->
    <div class="rail-stack rail-stack--bottom">
      <button class="rail-btn" :class="{ active: fullscreen }"
              @click="$emit('update:fullscreen', !fullscreen)" title="Tela cheia">⛶</button>
    </div>

    <!-- breadcrumb pill -->
    <div class="breadcrumb-pill" :aria-label="ariaLabel">
      <button class="crumb" @click="togglePeriod">{{ periodLabel }}</button>
      <span class="dot">·</span>
      <button class="crumb crumb--strong" @click="toggleBuilding">{{ buildingName }}</button>
      <template v-if="floorName">
        <span class="dot">·</span>
        <span class="crumb crumb--passive">{{ floorName }}</span>
      </template>
    </div>

    <!-- popovers -->
    <Transition name="popover">
      <div v-if="periodPopoverOpen" ref="periodRef" class="popover popover--period">
        <button v-for="p in PERIODS" :key="p.key"
                class="popover-item"
                :class="{ active: p.key === modelValue }"
                @click="onPeriodPick(p.key)">{{ p.label }}</button>
      </div>
    </Transition>

    <Transition name="popover">
      <div v-if="buildingPopoverOpen" ref="buildingRef" class="popover popover--building">
        <div class="popover-grid">
          <button class="popover-item" :class="{ active: !activeBuildingId }" @click="onBuildingPick(null)">Todos</button>
          <button v-for="b in buildings" :key="b.id"
                  class="popover-item"
                  :class="{ active: b.id === activeBuildingId }"
                  @click="onBuildingPick(b.id)">{{ b.name }}</button>
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
  z-index: 250;
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
  background: white;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.rail-btn.active {
  background: var(--color-brand);
  color: white;
}

.floor-stack {
  position: absolute;
  right: calc(8px + var(--rail-w) + var(--rail-gap));
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
}

.floor-btn {
  width: 36px;
  height: 36px;
  background: white;
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
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
  background: rgba(255, 255, 255, 0.94);
  padding: 6px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.crumb {
  border: none;
  background: none;
  padding: 0;
  font-size: 0.78rem;
  color: #333;
  cursor: pointer;
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
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 8px;
  pointer-events: auto;
  z-index: 300;
}

.popover--period {
  top: 8px;
  right: calc(16px + var(--rail-w));
  width: 140px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popover--building {
  top: calc(8px + var(--rail-w) + var(--rail-gap));
  right: calc(16px + var(--rail-w));
  width: 180px;
}

.popover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.popover-item {
  padding: 10px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popover-item.active {
  background: var(--color-brand);
  color: white;
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
