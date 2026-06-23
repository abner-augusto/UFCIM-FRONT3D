<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Space } from '@/types/space';
import { SPACE_TYPE_LABELS } from '@/types/space';

const props = defineProps<{
  open: boolean;
  spaces: Space[];
}>();

const emit = defineEmits<{
  close: [];
  select: [modelId: string];
}>();

const query = ref('');
const collapsed = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const navigableSpaces = computed(() =>
  props.spaces
    .filter((s) => s.modelId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (q.length < 1) return [];
  return navigableSpaces.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.number.toLowerCase().includes(q) ||
      s.block.toLowerCase().includes(q),
  );
});

// Auto-expand whenever a new result set comes in
watch(results, (r) => {
  if (r.length > 0) collapsed.value = false;
});

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      inputRef.value?.focus();
    } else {
      query.value = '';
      collapsed.value = false;
    }
  },
);

function select(space: Space) {
  if (!space.modelId) return;
  emit('select', space.modelId);
}

function clear() {
  query.value = '';
  collapsed.value = false;
  inputRef.value?.focus();
}
</script>

<template>
  <Transition name="widget">
    <div v-if="open" class="search-widget">

      <!-- Results panel — sits above the bar, expands upward -->
      <Transition name="panel">
        <div v-if="results.length > 0" class="results-panel">

          <!-- Sticky header: count + collapse toggle -->
          <button class="results-header" @click="collapsed = !collapsed">
            <span class="results-count">{{ results.length }} espaço{{ results.length !== 1 ? 's' : '' }}</span>
            <span class="results-chevron" :class="{ 'results-chevron--collapsed': collapsed }"></span>
          </button>

          <!-- Collapsible list -->
          <Transition name="list">
            <div v-if="!collapsed" class="results-list">
              <button
                v-for="s in results"
                :key="s.id"
                class="result-item press-feedback"
                @click="select(s)"
              >
                <span class="result-name">{{ s.name }}</span>
                <span class="result-meta">
                  {{ s.block }}
                  <span class="result-type">· {{ SPACE_TYPE_LABELS[s.type] ?? s.type }}</span>
                  <span v-if="!s.reservable" class="result-badge">indisponível</span>
                </span>
              </button>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Search input row -->
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          class="search-input"
          type="text"
          placeholder="Pesquisar espaço..."
          autocomplete="off"
        />
        <button v-if="query" class="search-clear" @click="clear" aria-label="Limpar pesquisa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="search-divider"></div>
        <button class="search-close" @click="$emit('close')" aria-label="Fechar pesquisa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

    </div>
  </Transition>
</template>

<style scoped>
.search-widget {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
}

/* On desktop, center and limit width to match controls */
@media (min-width: 481px) {
  .search-widget {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: auto;
    min-width: 320px;
    max-width: 480px;
    bottom: 76px; /* sit above the controls bar */
  }
}

/* ── Search bar ───────────────────────────────────────────── */
.search-bar {
  display: flex;
  align-items: center;
  background: var(--popover);
  border-radius: 14px;
  box-shadow: 0 3px 14px rgb(var(--shadow-color) / 0.18);
  padding: 0 10px;
  height: 48px;
  gap: 6px;
}

.search-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--muted-foreground);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.92rem;
  color: var(--foreground);
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

.search-clear,
.search-close {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  background: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--muted-foreground);
  padding: 0;
  transition: background 0.15s;
}

.search-clear:hover,
.search-close:hover {
  background: var(--accent);
  color: var(--foreground);
}

.search-clear svg,
.search-close svg {
  width: 14px;
  height: 14px;
}

.search-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  flex-shrink: 0;
}

/* ── Results panel ────────────────────────────────────────── */
.results-panel {
  background: var(--popover);
  border-radius: 14px;
  box-shadow: 0 3px 14px rgb(var(--shadow-color) / 0.15);
  overflow: hidden;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.results-header:hover {
  background: var(--accent);
}

.results-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Chevron: a small triangle rendered via border trick */
.results-chevron {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 6px solid var(--muted-foreground);
  transition: transform 0.2s ease;
}

.results-chevron--collapsed {
  transform: rotate(180deg);
}

.results-list {
  overflow-y: auto;
  max-height: 38vh;
  border-top: 1px solid var(--border);
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 11px 14px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item:active {
  background: var(--accent);
}

.result-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.3;
}

.result-meta {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.result-type {
  color: var(--muted-foreground);
}

.result-badge {
  font-size: 0.65rem;
  background: var(--muted);
  color: var(--muted-foreground);
  border-radius: 4px;
  padding: 1px 5px;
}

/* ── Transitions ──────────────────────────────────────────── */
.widget-enter-active,
.widget-leave-active {
  transition: opacity 0.2s ease;
}
.widget-enter-from,
.widget-leave-to {
  opacity: 0;
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.list-enter-active,
.list-leave-active {
  transition: opacity 0.15s ease, max-height 0.25s ease;
  overflow: hidden;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  max-height: 0 !important;
}
.list-enter-to,
.list-leave-from {
  opacity: 1;
  max-height: 38vh;
}
</style>
