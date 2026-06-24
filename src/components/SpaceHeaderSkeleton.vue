<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';

withDefaults(
  defineProps<{
    metaLines?: number;
  }>(),
  {
    metaLines: 1,
  },
);
</script>

<template>
  <div class="space-info">
    <div class="flex h-[1.9rem] items-center">
      <Skeleton class="h-[1rem] w-40 rounded" />
    </div>
    <div
      v-for="line in metaLines"
      :key="line"
      class="mt-[0.15rem] flex h-[1.3rem] items-center"
    >
      <Skeleton class="h-[0.6rem] rounded" :class="line === 1 ? 'w-36 max-w-[80%]' : 'w-28 max-w-[60%]'" />
    </div>
  </div>
</template>
