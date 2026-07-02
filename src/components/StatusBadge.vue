<script lang="ts">
export type StatusBadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'muted' | 'destructive';
</script>

<script setup lang="ts">
defineProps<{
  variant: StatusBadgeVariant;
}>();
</script>

<template>
  <span class="status-badge" :class="`status-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}

.status-badge--success { background: var(--success-surface); color: var(--success); }
.status-badge--danger { background: var(--danger-surface); color: var(--danger-fg); }
.status-badge--warning { background: var(--warning-surface); color: var(--warning); }
.status-badge--info { background: var(--info-surface); color: var(--info); }
.status-badge--violet { background: var(--violet-surface); color: var(--violet); }
.status-badge--muted { background: var(--muted); color: var(--muted-foreground); }
.status-badge--destructive { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
</style>
