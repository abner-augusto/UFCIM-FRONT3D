<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const router = useRouter();
const auth = useAuthStore();

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
