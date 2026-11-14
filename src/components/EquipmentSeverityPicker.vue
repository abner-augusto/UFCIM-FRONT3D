<script setup lang="ts">
import { SEVERITY_LABELS } from '@/types/equipment-report';
import { Button } from '@/components/ui/button';

defineProps<{ error?: string; disabled?: boolean }>();
const severity = defineModel<'minor' | 'major' | 'blocking' | null>({ required: true });
</script>

<template>
  <div class="dialog__field">
    <p id="report-severity-label" class="dialog__label">Gravidade *</p>
    <div
      class="severity-options"
      role="group"
      aria-labelledby="report-severity-label"
      :aria-describedby="error ? 'report-severity-error' : undefined"
    >
      <Button
        v-for="s in (['minor', 'major', 'blocking'] as const)"
        :key="s"
        :id="s === 'minor' ? 'report-severity-first' : undefined"
        type="button"
        variant="outline"
        class="severity-btn"
        :class="{ 'severity-btn--selected': severity === s, [`severity-btn--${s}`]: severity === s }"
        :aria-pressed="severity === s"
        :disabled="disabled"
        @click="severity = s"
      >
        <span class="severity-btn__label">{{ SEVERITY_LABELS[s] }}</span>
      </Button>
    </div>
    <p v-if="error" id="report-severity-error" class="dialog__field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.dialog__field { margin-bottom: 1.25rem; }
.dialog__label { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.06em; margin-bottom: 0.4rem; }
.dialog__field-error { color: var(--destructive); font-size: 0.75rem; }
/* Severity buttons */
.severity-options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.severity-btn {
  display: block;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid var(--input);
  border-radius: 10px;
  background: var(--background);
  font-size: 0.82rem;
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  min-height: 44px;
}

.severity-btn:hover {
  background: var(--accent);
  border-color: var(--border);
}

.severity-btn--selected {
  border-width: 2px;
}

.severity-btn--selected.severity-btn--minor {
  background: var(--warning-surface);
  border-color: var(--warning);
  color: var(--warning);
}

.severity-btn--selected.severity-btn--major {
  background: var(--danger-surface);
  border-color: var(--danger-fg);
  color: var(--danger-fg);
}

.severity-btn--selected.severity-btn--blocking {
  background: color-mix(in srgb, var(--destructive) 15%, transparent);
  border-color: var(--destructive);
  color: var(--destructive);
}

.severity-btn__label {
  font-weight: 500;
}

</style>
