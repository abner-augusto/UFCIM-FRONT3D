<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { usePwaUpdate } from '@/composables/usePwaUpdate';

const { needRefresh, update, dismiss } = usePwaUpdate();
</script>

<template>
  <Transition name="update-toast">
    <div v-if="needRefresh" class="update-toast" role="status" aria-live="polite">
      <RefreshCw class="update-toast__icon" />
      <div class="update-toast__text">
        <p class="update-toast__title">Nova versão disponível</p>
        <p class="update-toast__desc">Atualize para carregar as últimas melhorias.</p>
      </div>
      <div class="update-toast__actions">
        <Button variant="ghost" size="sm" @click="dismiss">Agora não</Button>
        <Button size="sm" @click="update">Atualizar</Button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  /* Sit above the mobile tab bar; falls back to a comfortable gap on desktop. */
  bottom: calc(var(--bottom-bar-h, 0px) + var(--safe-bottom, 0px) + 16px);
  z-index: var(--z-toast, 100);

  display: flex;
  align-items: center;
  gap: 12px;
  width: min(420px, calc(100vw - 32px));
  padding: 12px 14px;

  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  background: var(--popover, var(--background));
  color: var(--popover-foreground, var(--foreground));
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.18);
}

.update-toast__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--primary);
}

.update-toast__text {
  flex: 1;
  min-width: 0;
}

.update-toast__title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.update-toast__desc {
  margin-top: 2px;
  font-size: 0.78rem;
  line-height: 1.25;
  color: var(--muted-foreground);
}

.update-toast__actions {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
}

/* Gentle slide + fade from the bottom. */
.update-toast-enter-active {
  transition: opacity 220ms var(--ease-out-expo, ease), transform 220ms var(--ease-out-expo, ease);
}
.update-toast-leave-active {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}
.update-toast-enter-from,
.update-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
