<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { campuses } from '@/data/campuses';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const route = useRoute();
const router = useRouter();

const campusId = route.params.campusId as string;
const campus = computed(() => campuses.find(c => c.id === campusId));

function handleSelect(_deptId: string) {
  // Only IAUD maps to the viewer — future departments can use their own route
  router.push({ name: 'viewer', params: { campusId } });
}
</script>

<template>
  <div class="mx-auto max-w-[900px] px-4 py-8">
    <div class="mb-8 flex items-start gap-4">
      <Button variant="ghost" class="text-primary mt-1 px-0 whitespace-nowrap" @click="router.back()">← Voltar</Button>
      <div>
        <h1 class="mb-1 text-2xl font-semibold">{{ campus?.name }}</h1>
        <p class="text-muted-foreground m-0 text-sm">Selecione a unidade para visualizar e reservar espaços</p>
      </div>
    </div>

    <div v-if="!campus" class="text-destructive text-sm">Campus não encontrado.</div>

    <div v-else class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
      <Card
        v-for="dept in campus.departments"
        :key="dept.id"
        class="hover:border-primary cursor-pointer gap-1.5 p-5 transition-[border-color,box-shadow] hover:shadow-[0_2px_8px_rgba(29,158,117,0.1)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border aria-disabled:hover:shadow-none"
        role="button"
        :tabindex="dept.active ? 0 : -1"
        :aria-disabled="!dept.active"
        @click="dept.active && handleSelect(dept.id)"
        @keydown.enter="dept.active && handleSelect(dept.id)"
      >
        <div class="flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold">{{ dept.shortName }}</h3>
          <Badge v-if="!dept.active" variant="secondary" class="bg-muted text-muted-foreground">Em breve</Badge>
        </div>
        <p class="text-muted-foreground m-0 text-xs">{{ dept.name }}</p>
        <p class="text-muted-foreground m-0 text-sm">{{ dept.description }}</p>
      </Card>
    </div>
  </div>
</template>
