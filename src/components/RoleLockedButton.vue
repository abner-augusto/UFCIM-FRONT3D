<script setup lang="ts">
import { ref } from 'vue';
import type { HTMLAttributes } from 'vue';
import { Lock } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import type { ButtonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * A CTA the current role cannot use (MEL-008), with a tooltip saying why.
 *
 * It uses aria-disabled instead of the native `disabled` attribute: a disabled
 * button receives no pointer, focus or click events, so the tooltip could never
 * open. This way it opens on hover, keyboard focus and tap (touch has no hover),
 * and screen readers announce the button as unavailable with the reason.
 */
const props = defineProps<{
  reason: string;
  variant?: ButtonVariants['variant'];
  class?: HTMLAttributes['class'];
}>();

const open = ref(false);
</script>

<template>
  <Tooltip v-model:open="open" disable-closing-trigger>
    <TooltipTrigger as-child>
      <Button
        type="button"
        :variant="variant"
        aria-disabled="true"
        :class="cn('cursor-not-allowed opacity-50 hover:bg-transparent', props.class)"
        @click.prevent="open = true"
      >
        <Lock aria-hidden="true" />
        <slot />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">{{ reason }}</TooltipContent>
  </Tooltip>
</template>
