<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useCampusStore } from '@/stores/campus';
import { usePermissions } from '@/composables/usePermissions';
import { Building2, Search, Calendar, Ban, BarChart3, Wrench, User } from 'lucide-vue-next';

const campus = useCampusStore();
const route = useRoute();

const viewerTarget = computed(() =>
  campus.selectedCampusId
    ? { name: 'viewer', params: { campusId: campus.selectedCampusId } }
    : '/campus'
);
const browserTarget = computed(() =>
  campus.selectedCampusId
    ? { name: 'space-browser', params: { campusId: campus.selectedCampusId } }
    : '/campus'
);

const { canBlock, canViewReports, canManageEquipment } = usePermissions();
const isActive = (name: string) => route.name === name;

// Horizontal-scroll affordance: edge fades that show only when there's more
// content in that direction, plus auto-centering of the active tab so the
// current page is never stranded off-screen (privileged roles overflow the bar).
const scrollEl = ref<HTMLElement | null>(null);
const showLeftFade = ref(false);
const showRightFade = ref(false);
const hinting = ref(false);

const HINT_SEEN_KEY = 'tabbar-scroll-hint-seen';

function updateFades() {
  const el = scrollEl.value;
  if (!el) return;
  const max = el.scrollWidth - el.clientWidth;
  showLeftFade.value = el.scrollLeft > 1;
  showRightFade.value = el.scrollLeft < max - 1;
}

function centerActiveTab() {
  const el = scrollEl.value;
  if (!el) return;
  const activeEl = el.querySelector<HTMLElement>('.tab-item.active');
  if (!activeEl) return;
  const target = activeEl.offsetLeft - (el.clientWidth - activeEl.offsetWidth) / 2;
  el.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
}

function refresh() {
  centerActiveTab();
  updateFades();
}

// One-time hint: gently slide a hidden tab into view and back, with a matching
// pulse on the edge fade, so first-time users learn the bar scrolls. Fires once
// per session and only when there's actually something to scroll to.
function playScrollHintOnce() {
  const el = scrollEl.value;
  if (!el) return;
  if (sessionStorage.getItem(HINT_SEEN_KEY)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const max = el.scrollWidth - el.clientWidth;
  if (max <= 4) return; // not scrollable — nothing to hint

  // Prefer nudging toward whichever side still has hidden tabs (usually right).
  const room = max - el.scrollLeft;
  const amount = room > 4 ? Math.min(32, room) : -Math.min(32, el.scrollLeft);
  if (amount === 0) return;

  sessionStorage.setItem(HINT_SEEN_KEY, '1');
  hinting.value = true;
  el.scrollBy({ left: amount, behavior: 'smooth' });
  window.setTimeout(() => {
    el.scrollBy({ left: -amount, behavior: 'smooth' });
  }, 420);
  window.setTimeout(() => {
    hinting.value = false;
  }, 1100);
}

onMounted(async () => {
  await nextTick();
  refresh();
  window.addEventListener('resize', refresh);
  // Let the centering settle before nudging.
  window.setTimeout(playScrollHintOnce, 600);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', refresh);
});

watch(
  () => route.name,
  async () => {
    await nextTick();
    refresh();
  }
);
</script>

<template>
  <nav
    class="bottom-tab-bar"
    :class="{ 'has-left-fade': showLeftFade, 'has-right-fade': showRightFade, hinting }"
  >
    <div ref="scrollEl" class="tab-scroll" @scroll="updateFades">
      <router-link :to="viewerTarget" class="tab-item" :class="{ active: isActive('viewer') }">
        <span class="tab-icon"><Building2 :size="20" /></span>
        <span class="tab-label">Maquete 3D</span>
      </router-link>

      <router-link :to="browserTarget" class="tab-item" :class="{ active: isActive('space-browser') }">
        <span class="tab-icon"><Search :size="20" /></span>
        <span class="tab-label">Buscar</span>
      </router-link>

      <router-link to="/minhas-reservas" class="tab-item" :class="{ active: isActive('my-reservations') }">
        <span class="tab-icon"><Calendar :size="20" /></span>
        <span class="tab-label">Reservas</span>
      </router-link>

      <router-link v-if="canBlock" to="/meus-bloqueios" class="tab-item" :class="{ active: isActive('my-blockings') }">
        <span class="tab-icon"><Ban :size="20" /></span>
        <span class="tab-label">Bloqueios</span>
      </router-link>

      <router-link v-if="canViewReports" to="/relatorios" class="tab-item" :class="{ active: isActive('reports') }">
        <span class="tab-icon"><BarChart3 :size="20" /></span>
        <span class="tab-label">Relatórios</span>
      </router-link>

      <router-link v-if="canManageEquipment" to="/manutencao/chamados" class="tab-item" :class="{ active: isActive('maintenance-reports') }">
        <span class="tab-icon"><Wrench :size="20" /></span>
        <span class="tab-label">Chamados</span>
      </router-link>

      <router-link to="/perfil" class="tab-item" :class="{ active: isActive('profile') }">
        <span class="tab-icon"><User :size="20" /></span>
        <span class="tab-label">Perfil</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--bottom-bar-h) + var(--safe-bottom));
  background: var(--background);
  border-top: 1px solid var(--border);
  padding-bottom: var(--safe-bottom);
  z-index: var(--z-chrome);
}

@media (min-width: 1024px) {
  .bottom-tab-bar {
    display: none;
  }
}

/* Inner horizontal-scroll track */
.tab-scroll {
  display: flex;
  align-items: center;
  height: var(--bottom-bar-h);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
.tab-scroll::-webkit-scrollbar {
  display: none;
}

/* Edge fades — only rendered when there's more to scroll that way. They sit on
   the fixed bar (not the scroll track) so they stay pinned while content moves. */
.bottom-tab-bar::before,
.bottom-tab-bar::after {
  content: '';
  position: absolute;
  top: 0;
  width: 24px;
  height: var(--bottom-bar-h);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--duration-fast, 0.15s) ease;
  z-index: 1;
}
.bottom-tab-bar::before {
  left: 0;
  background: linear-gradient(to right, var(--background), transparent);
}
.bottom-tab-bar::after {
  right: 0;
  background: linear-gradient(to left, var(--background), transparent);
}
.bottom-tab-bar.has-left-fade::before {
  opacity: 1;
}
.bottom-tab-bar.has-right-fade::after {
  opacity: 1;
}

/* One-time scroll hint: the edge breathes wider in sync with the nudge. */
.bottom-tab-bar.hinting::after {
  opacity: 1;
  animation: edge-nudge 1.05s var(--ease-out-quart, ease) both;
}

@keyframes edge-nudge {
  0%   { width: 24px; }
  30%  { width: 46px; }
  60%  { width: 24px; }
  100% { width: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .bottom-tab-bar.hinting::after {
    animation: none;
  }
}

.tab-item {
  /* Grow to fill the bar when few tabs; hold intrinsic width and overflow
     (scroll) when many. Never shrink below a comfortable tap target. */
  flex: 1 0 auto;
  min-width: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 0.6rem;
  height: var(--bottom-bar-h);
  min-height: var(--tap-min);
  text-decoration: none;
  color: var(--muted-foreground);
  gap: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--duration-fast) ease;
  cursor: pointer;
}

.tab-item:active {
  transform: scale(0.92);
}

.tab-item.active {
  color: var(--color-brand);
}

.tab-item.active .tab-icon {
  transform: scale(1.1);
}

.tab-icon {
  font-size: 1.25rem;
  transition: transform var(--duration-fast) var(--ease-out-quart, ease);
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
}
</style>
