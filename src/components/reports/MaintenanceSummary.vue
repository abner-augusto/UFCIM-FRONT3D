<script setup lang="ts">
import type { Component } from 'vue';

// Stat-card row shared by the list and the detail of the maintenance history.
defineProps<{
  items: Array<{ label: string; value: string | number; icon: Component }>;
}>();
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
    <div
      v-for="item in items"
      :key="item.label"
      class="bg-card border-border flex items-center gap-3 rounded-[12px] border p-4"
    >
      <span class="text-primary shrink-0" aria-hidden="true"><component :is="item.icon" :size="26" /></span>
      <div class="flex min-w-0 flex-col">
        <span class="text-foreground text-[1.35rem] leading-tight font-bold">{{ item.value }}</span>
        <span class="text-muted-foreground mt-0.5 text-[0.8rem]">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>
