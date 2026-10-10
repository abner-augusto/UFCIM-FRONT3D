<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Check, X } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { capabilitiesFor, roleSummary, whoHasCapability } from '@/utils/permissions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const router = useRouter();
const auth = useAuthStore();

// MEL-008: what the current role allows, with denied capabilities kept visible
// (dimmed, with who has them) so the user learns the limit before hitting it.
const permissions = computed(() => (auth.userRole ? capabilitiesFor(auth.userRole) : []));
const permissionsSummary = computed(() => roleSummary(auth.userRole));

interface UserProfile {
  id: string;
  name: string;
  email: string;
  registration: string | null;
  role: string;
  department?: string;
}

const profile = ref<UserProfile | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudante',
  professor: 'Professor(a)',
  staff: 'Funcionário(a)',
  maintenance: 'Manutenção',
};

onMounted(async () => {
  try {
    profile.value = await api.getMe(auth.token);
  } catch {
    errorMsg.value = 'Não foi possível carregar os dados do perfil.';
  } finally {
    loading.value = false;
  }
});

function handleLogout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="mx-auto max-w-[540px] px-4 py-6 supports-[min-height:100dvh]:min-h-dvh">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" class="text-primary px-0" @click="router.back()">← Voltar</Button>
      <h1 class="m-0 text-xl font-semibold">Meu Perfil</h1>
    </div>

    <Card v-if="loading" class="mb-6 gap-0 overflow-hidden py-0" aria-busy="true" aria-label="Carregando perfil">
      <div
        v-for="row in 4"
        :key="row"
        class="flex items-center justify-between px-5 py-3.5"
        :class="{ 'border-b': row < 4 }"
      >
        <Skeleton class="h-4 w-20" />
        <Skeleton class="h-4" :class="row % 2 ? 'w-40' : 'w-28'" />
      </div>
    </Card>
    <div v-else-if="errorMsg" class="text-destructive text-sm" role="alert">{{ errorMsg }}</div>

    <Card v-else-if="profile" class="mb-6 gap-0 overflow-hidden py-0">
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Nome</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ profile.name }}</span>
      </div>
      <div v-if="profile.registration" class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Matrícula</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ profile.registration }}</span>
      </div>
      <div class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Email</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ profile.email }}</span>
      </div>
      <div v-if="profile.department" class="flex items-center justify-between border-b px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Departamento</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ profile.department }}</span>
      </div>
      <div class="flex items-center justify-between px-5 py-3.5">
        <span class="text-muted-foreground text-sm">Perfil</span>
        <span class="max-w-[60%] text-right text-sm font-medium">{{ ROLE_LABELS[profile.role] ?? profile.role }}</span>
      </div>
    </Card>

    <section v-if="!loading && permissions.length" id="permissoes" class="mb-6" aria-labelledby="permissions-heading">
      <h2 id="permissions-heading" class="text-muted-foreground mx-1 mb-1 text-[0.7rem] font-bold tracking-[0.06em] uppercase">
        Suas permissões
      </h2>
      <p v-if="permissionsSummary" class="text-muted-foreground mx-1 mt-0 mb-3 text-sm">{{ permissionsSummary }}</p>
      <Card class="gap-0 overflow-hidden py-0">
        <ul class="m-0 list-none p-0">
          <li
            v-for="(cap, index) in permissions"
            :key="cap.id"
            class="flex items-start gap-3 px-5 py-3.5"
            :class="{ 'border-b': index < permissions.length - 1 }"
          >
            <span
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
              :class="cap.granted ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground'"
              aria-hidden="true"
            >
              <Check v-if="cap.granted" class="size-3.5" />
              <X v-else class="size-3.5" />
            </span>
            <div class="min-w-0">
              <p class="m-0 text-sm" :class="cap.granted ? 'font-medium' : 'text-muted-foreground'">
                {{ cap.label }}
                <span class="sr-only">{{ cap.granted ? '(permitido)' : '(não permitido)' }}</span>
              </p>
              <p class="text-muted-foreground m-0 text-xs leading-snug">
                {{ cap.granted ? cap.description : whoHasCapability(cap.id) }}
              </p>
            </div>
          </li>
        </ul>
      </Card>
    </section>

    <Button
      v-if="!loading"
      variant="outline"
      class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-11 w-full lg:flex max-lg:hidden"
      @click="handleLogout"
    >
      Sair
    </Button>
  </div>
</template>
