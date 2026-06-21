<script setup lang="ts">
import type { Campus } from '@/data/campuses';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

defineProps<{
  campus: Campus;
}>();

defineEmits<{
  select: [campusId: string];
}>();
</script>

<template>
  <Card
    class="hover:border-primary cursor-pointer gap-2 p-5 transition-[border-color,box-shadow] hover:shadow-[0_2px_8px_rgba(29,158,117,0.1)] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border aria-disabled:hover:shadow-none"
    role="button"
    :tabindex="campus.active ? 0 : -1"
    :aria-disabled="!campus.active"
    @click="campus.active && $emit('select', campus.id)"
    @keydown.enter="campus.active && $emit('select', campus.id)"
  >
    <div class="flex items-center justify-between">
      <h3 class="m-0 text-lg font-semibold">{{ campus.shortName }}</h3>
      <Badge v-if="!campus.active" variant="secondary" class="bg-muted text-muted-foreground">Em breve</Badge>
    </div>
    <p class="text-muted-foreground m-0 text-sm">{{ campus.description }}</p>
    <p class="m-0 text-xs text-[#999]">
      {{ campus.city }}{{ campus.neighborhood ? ` — ${campus.neighborhood}` : '' }}
    </p>
    <div v-if="campus.active && campus.buildings.length" class="mt-1 flex flex-wrap gap-1.5">
      <Badge v-for="b in campus.buildings" :key="b" variant="secondary" class="rounded-md">{{ b }}</Badge>
    </div>
  </Card>
</template>
