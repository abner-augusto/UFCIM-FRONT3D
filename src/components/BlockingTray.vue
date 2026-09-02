<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import BlockingForm, { type BlockingPayload } from '@/components/BlockingForm.vue';
import { api, ApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import type { ActionStatus } from '@/components/StatefulActionButton.vue';

const props = defineProps<{
  open: boolean;
  campusId: string;
  spaceId: string;
  spaceName: string;
  modelId?: string | null;
  initialDate?: string;
}>();

const emit = defineEmits<{
  'update:open': [open: boolean];
  'back-to-map': [];
}>();

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const mediaQuery = window.matchMedia('(min-width: 768px)');
const submitStatus = ref<ActionStatus>('idle');
const errorMsg = ref<string | null>(null);

const onViewer = computed(() => route.name === 'viewer');
const canReturnToMap = computed(() => onViewer.value || !!props.modelId);

function resetFlow() {
  submitStatus.value = 'idle';
  errorMsg.value = null;
}

watch(() => [props.campusId, props.spaceId], resetFlow);
watch(() => props.open, (open, wasOpen) => {
  if (open && wasOpen === false) resetFlow();
});

function handleMediaChange(event: MediaQueryListEvent | MediaQueryList) {
  isDesktop.value = event.matches;
}

onMounted(() => mediaQuery.addEventListener('change', handleMediaChange));
onUnmounted(() => mediaQuery.removeEventListener('change', handleMediaChange));

function handleOpenChange(open: boolean) {
  emit('update:open', open);
}

function closeTray() {
  emit('update:open', false);
}

async function handleSubmit(payload: BlockingPayload) {
  if (submitStatus.value === 'submitting' || submitStatus.value === 'success') return;
  submitStatus.value = 'submitting';
  errorMsg.value = null;

  try {
    await api.createBlocking(auth.token, { spaceId: props.spaceId, ...payload });
    submitStatus.value = 'success';
  } catch (error) {
    submitStatus.value = 'error';
    errorMsg.value = error instanceof ApiError && error.message
      ? error.message
      : 'Não foi possível criar o bloqueio.';
  }
}

function handleViewBlockings() {
  void router.push({ name: 'my-blockings' });
  closeTray();
}

function handleBackToMap() {
  emit('back-to-map');
  if (!onViewer.value && props.modelId) {
    void router.push({
      name: 'viewer',
      params: { campusId: props.campusId },
      query: { space: props.modelId },
    });
  }
  closeTray();
}
</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="blocking-tray z-[var(--z-modal)]"
      :class="isDesktop
        ? 'top-auto! bottom-[7dvh]! translate-y-0! max-h-[86dvh]! overflow-y-auto'
        : 'mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      :show-close-button="true"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
    >
      <div class="blocking-tray__body">
        <header class="blocking-tray__header">
          <component :is="isDesktop ? DialogTitle : DrawerTitle" class="blocking-tray__title">
            Bloquear espaço
          </component>
          <component :is="isDesktop ? DialogDescription : DrawerDescription" class="blocking-tray__description">
            Configure o bloqueio para {{ spaceName }}.
          </component>
        </header>

        <BlockingForm
          v-if="submitStatus !== 'success'"
          :status="submitStatus"
          :error="errorMsg"
          :initial-date="initialDate"
          @submit="handleSubmit"
        />

        <section v-else class="blocking-tray__success" role="status" aria-live="polite">
          <div class="blocking-tray__success-head">
            <span class="blocking-tray__success-mark" aria-hidden="true">✓</span>
            <div>
              <h2>Espaço bloqueado</h2>
              <p>O bloqueio foi criado com sucesso.</p>
            </div>
          </div>
          <div class="blocking-tray__success-actions">
            <Button type="button" @click="handleViewBlockings">Ver meus bloqueios</Button>
            <Button v-if="canReturnToMap" type="button" variant="outline" @click="handleBackToMap">
              Voltar para maquete
            </Button>
          </div>
        </section>
      </div>
    </component>
  </component>
</template>

<style>
.blocking-tray[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.blocking-tray {
  width: 100%;
  max-width: 420px;
  padding: 1.5rem;
  border-radius: 20px;
  background: var(--popover);
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
}
.blocking-tray::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  margin: 0 auto 1rem;
  border-radius: 2px;
  background: var(--border);
}
.blocking-tray__body { display: flex; flex-direction: column; gap: 1rem; }
.blocking-tray__header { display: flex; flex-direction: column; gap: 0.25rem; }
.blocking-tray__title { margin: 0; color: var(--foreground); font-size: 1.1rem; font-weight: 700; }
.blocking-tray__description { margin: 0; color: var(--muted-foreground); font-size: 0.85rem; }
.blocking-tray__success { display: flex; flex-direction: column; gap: 1rem; min-height: 20rem; }
.blocking-tray__success-head { display: flex; align-items: flex-start; gap: 0.75rem; }
.blocking-tray__success-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success, #16a34a) 14%, transparent);
  color: var(--success, #16a34a);
  font-size: 1.05rem;
  font-weight: 800;
}
.blocking-tray__success h2 { margin: 0; color: var(--foreground); font-size: 1rem; font-weight: 700; }
.blocking-tray__success p { margin: 0.2rem 0 0; color: var(--muted-foreground); font-size: 0.82rem; }
.blocking-tray__success-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: auto; }
.blocking-tray__success-actions button { flex: 1; min-height: var(--tap-min, 44px); }

@media (max-width: 480px) {
  .blocking-tray { max-width: none; padding: 0 1.5rem calc(1.5rem + var(--safe-bottom, 0px)); }
  .blocking-tray__success-actions { flex-direction: column; }
}
</style>
