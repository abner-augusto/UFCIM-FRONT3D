<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Check, Info, X } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/utils/roles';
import { ROLE_NOUNS, roleHintItems } from '@/utils/permissions';
import { dismissRoleHint, isRoleHintDismissed } from '@/utils/role-hint';
import { Button } from '@/components/ui/button';

/**
 * First-access hint (MEL-008): what the user's profile allows, once per role
 * and session. Dismissal is kept in sessionStorage (see `@/utils/role-hint`).
 */
const auth = useAuthStore();

// Also tracked in memory, so dismissing works when storage is blocked.
const dismissedRole = ref<UserRole | null>(null);

const role = computed(() => auth.userRole);
const visible = computed(
  () => !!role.value && dismissedRole.value !== role.value && !isRoleHintDismissed(role.value),
);
const items = computed(() => (role.value ? roleHintItems(role.value) : []));

function dismiss() {
  if (!role.value) return;
  dismissRoleHint(role.value);
  dismissedRole.value = role.value;
}
</script>

<template>
  <Transition name="role-hint">
    <aside
      v-if="visible && role"
      class="bg-secondary text-secondary-foreground rounded-xl px-4 py-3.5"
      aria-labelledby="role-hint-title"
    >
      <div class="flex items-start gap-3">
        <Info class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <h2 id="role-hint-title" class="m-0 text-sm font-semibold">
            O que o seu perfil de {{ ROLE_NOUNS[role] }} permite
          </h2>
          <ul class="mt-2 mb-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            <li v-for="item in items" :key="item.text" class="flex items-start gap-2">
              <Check v-if="item.granted" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <X v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{{ item.text }}</span>
            </li>
          </ul>
          <RouterLink
            :to="{ name: 'profile' }"
            class="text-primary mt-1 inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
          >
            Ver todas as permissões
          </RouterLink>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="-mt-2 -mr-2 size-11 shrink-0"
          aria-label="Dispensar orientações do perfil"
          @click="dismiss"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.role-hint-leave-active {
  transition: opacity 160ms ease-in, transform 160ms ease-in;
}
.role-hint-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .role-hint-leave-active {
    transition: none;
  }
}
</style>
