<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { useViewerSync } from '@/composables/useViewerSync';
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
  navigateToPin: (modelId: string) => void;
}

const props = defineProps<{
  viewerRef: ThreeViewerExposed | null;
  ready: boolean;
  visible: boolean;
}>();

defineEmits<{
  'open-search': [];
}>();

const { activeBuildingId, activeFloorLevel, buildings, floors } = useViewerSync(
  () => props.viewerRef,
  () => props.ready,
);

function selectBuilding(id: string | null) {
  props.viewerRef?.selectBuilding(id);
}

function selectFloor(level: number) {
  props.viewerRef?.selectFloor(level);
}

function shortFloorLabel(name: string): string {
  if (name === 'Térreo') return 'T';
  const digitMatch = name.match(/^(\d+)º/);
  if (digitMatch) return digitMatch[1];
  if (name === 'Subsolo') return '-1';
  return name.substring(0, 2);
}


</script>

<template>
  <Transition name="controls-fade">
    <div v-if="visible" class="desktop-controls">
      <!-- Floor buttons (above buildings, only when a building is selected) -->
      <Transition name="floor-slide">
        <div v-if="activeBuildingId && floors.length > 0" class="controls-row controls-row--floors">
          <Button
            v-for="f in floors" :key="f.level"
            variant="ghost"
            class="ctrl-btn ctrl-btn--sm"
            :class="{ active: f.level === activeFloorLevel }"
            @click="selectFloor(f.level)"
          >{{ shortFloorLabel(f.name) }}</Button>
        </div>
      </Transition>

      <!-- Building buttons -->
      <div class="controls-row">
        <Button
          variant="ghost"
          class="ctrl-btn"
          :class="{ active: activeBuildingId === null }"
          @click="selectBuilding(null)"
        >Todos</Button>
        <Button
          v-for="b in buildings" :key="b.id"
          variant="ghost"
          class="ctrl-btn"
          :class="{ active: b.id === activeBuildingId }"
          @click="selectBuilding(b.id)"
        >{{ b.name }}</Button>
        <div class="controls-separator"></div>
        <Button variant="ghost" size="icon" class="ctrl-btn ctrl-btn--icon" @click="$emit('open-search')" title="Pesquisar">
          <Search :size="18" />
        </Button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.desktop-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: var(--z-chrome);
  pointer-events: auto;
}

/* Hide on mobile — ViewerControlsRail handles that */
@media (max-width: 480px) {
  .desktop-controls {
    display: none !important;
  }
}

.controls-row {
  display: flex;
  gap: 5px;
  background: color-mix(in oklab, var(--popover) 88%, transparent);
  backdrop-filter: blur(8px);
  padding: 6px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgb(var(--shadow-color) / 0.12);
}

.controls-separator {
  width: 1px;
  background: var(--border);
  margin: 4px 2px;
  align-self: stretch;
}

.ctrl-btn {
  padding: 8px 14px;
  border-radius: 8px;
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 36px;
}

.ctrl-btn:hover {
  background: var(--accent);
}

.ctrl-btn.active {
  background: var(--primary);
  color: var(--primary-foreground);
}

.ctrl-btn.active:hover {
  background: color-mix(in srgb, var(--primary), black 12%);
}

.ctrl-btn--icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  min-width: 36px;
}

.ctrl-btn--sm {
  padding: 6px 10px;
  min-height: 32px;
  font-size: 12px;
}

/* Transitions */
.controls-fade-enter-active,
.controls-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.controls-fade-enter-from,
.controls-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.floor-slide-enter-active,
.floor-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.floor-slide-enter-from,
.floor-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
