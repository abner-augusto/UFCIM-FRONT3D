<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Placeholder for a loading list of summary cards (a title line, a couple of
 * secondary lines, and a trailing badge) — the shape shared by the reservation,
 * blocking and notification lists. Replaces a centered "Carregando..." string
 * so the list loads in place without a layout jump.
 */
withDefaults(
  defineProps<{
    count?: number;
    /** Secondary lines under the title. */
    lines?: number;
    label?: string;
  }>(),
  { count: 5, lines: 2, label: 'Carregando' },
);
</script>

<template>
  <ul class="flex flex-col gap-2" role="status" :aria-label="label">
    <li
      v-for="n in count"
      :key="n"
      class="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-[0.9rem]"
    >
      <div class="min-w-0 flex-1">
        <div class="flex h-[1.5rem] items-center">
          <Skeleton class="h-[0.8rem] rounded" :class="n % 2 ? 'w-44' : 'w-32'" />
        </div>
        <div
          v-for="l in lines"
          :key="l"
          class="mt-[0.25rem] flex h-[1.2rem] items-center"
        >
          <Skeleton
            class="h-[0.6rem] rounded"
            :class="l === lines ? 'w-32 max-w-[55%]' : 'w-52 max-w-[75%]'"
          />
        </div>
      </div>
      <Skeleton class="h-5 w-16 shrink-0 rounded-full" />
    </li>
  </ul>
</template>
