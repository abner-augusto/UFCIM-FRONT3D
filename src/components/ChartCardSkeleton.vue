<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';

withDefaults(
  defineProps<{
    titleWidth?: string;
    heightClass?: string;
  }>(),
  {
    titleWidth: 'w-36',
    heightClass: 'h-[280px]',
  },
);
</script>

<template>
  <div class="border-border bg-card rounded-[12px] border p-5" aria-hidden="true">
    <div class="flex h-6 items-center">
      <Skeleton class="h-4 rounded" :class="titleWidth" />
    </div>
    <div class="mt-4">
      <Skeleton class="w-full rounded-xl" :class="heightClass" />
    </div>
  </div>
</template>
