<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCampusStore } from '@/stores/campus';
import { api } from '@/services/api';
import { usePermissions } from '@/composables/usePermissions';
import { campuses } from '@/data/campuses';
import SpaceHeaderSkeleton from '@/components/SpaceHeaderSkeleton.vue';
import { Button } from '@/components/ui/button';
import BlockingForm, { type BlockingPayload } from '@/components/BlockingForm.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const campusStore = useCampusStore();
const { canBlock } = usePermissions();

const spaceId = route.params.spaceId as string;
const spaceName = ref<string | null>(null);
const spaceModelId = ref<string | null>(null);
const spaceCampus = ref<string | null>(null);
const loadingSpace = ref(true);

const submitStatus = ref<'idle' | 'submitting' | 'success' | 'error'>('idle');
const errorMsg = ref<string | null>(null);

const viewerCampusId = computed(() =>
  campuses.find((campus) => campus.shortName === spaceCampus.value)?.id ?? campusStore.selectedCampusId,
);
const canReturnToMap = computed(() => !!spaceModelId.value && !!viewerCampusId.value);

onMounted(async () => {
  if (!canBlock.value) {
    router.replace({ name: 'campus-select' });
    return;
  }
  try {
    const space = await api.getSpace(auth.token, spaceId);
    spaceName.value = space.name;
    spaceModelId.value = space.modelId;
    spaceCampus.value = space.campus;
  } catch {
    spaceName.value = 'Espaço';
  } finally {
    loadingSpace.value = false;
  }
});

async function handleSubmit(payload: BlockingPayload) {
  if (submitStatus.value === 'submitting' || submitStatus.value === 'success') return;
  submitStatus.value = 'submitting';
  errorMsg.value = null;
  try {
    await api.createBlocking(auth.token, {
      spaceId,
      ...payload,
    });
    submitStatus.value = 'success';
  } catch (e) {
    submitStatus.value = 'error';
    errorMsg.value = e instanceof Error ? e.message : 'Não foi possível criar o bloqueio.';
  }
}

function handleViewBlockings() {
  void router.push({ name: 'my-blockings' });
}

function handleBackToMap() {
  if (!viewerCampusId.value) return;
  void router.push({
    name: 'viewer',
    params: { campusId: viewerCampusId.value },
    query: spaceModelId.value ? { space: spaceModelId.value } : undefined,
  });
}
</script>

<template>
  <div class="blocking-create-view">
    <div class="view-header">
      <Button variant="ghost" class="back-btn" @click="router.back()">← Voltar</Button>
      <h1>Bloquear Espaço</h1>
    </div>

    <SpaceHeaderSkeleton v-if="loadingSpace" role="status" aria-label="Carregando espaço" />

    <div v-else>
      <div class="space-info">
        <h2>{{ spaceName }}</h2>
      </div>

      <BlockingForm
        v-if="submitStatus !== 'success'"
        :status="submitStatus"
        :error="errorMsg"
        @submit="handleSubmit"
      />

      <template v-if="submitStatus === 'success'">
        <div class="blocking-success" role="status" aria-live="polite">
          <span class="blocking-success__mark" aria-hidden="true">✓</span>
          <div>
            <h2 class="blocking-success__title">Espaço bloqueado</h2>
            <p class="blocking-success__text">O bloqueio foi criado com sucesso.</p>
          </div>
        </div>

        <div class="blocking-success__actions">
          <Button @click="handleViewBlockings">Ver meus bloqueios</Button>
          <Button v-if="canReturnToMap" variant="outline" @click="handleBackToMap">Voltar para maquete</Button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.blocking-create-view {
  max-width: 540px;
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
  color: var(--primary);
}
.space-info {
  background: var(--muted);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}
.space-info h2 {
  margin: 0;
  font-size: 1.1rem;
}
.blocking-success {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
}
.blocking-success__mark {
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
.blocking-success__title {
  margin: 0;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
}
.blocking-success__text {
  margin: 0.2rem 0 0;
  color: var(--muted-foreground);
  font-size: 0.86rem;
}
.blocking-success__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.25rem;
}
.blocking-success__actions button {
  flex: 1;
}

@media (max-width: 480px) {
  .blocking-success__actions {
    flex-direction: column;
  }
}
</style>
