<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, toRef } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { Space } from '@/types/space';
import { usePermissions } from '@/composables/usePermissions';
import { useRoomDetail } from '@/composables/useRoomDetail';
import EquipmentReportDialog from './EquipmentReportDialog.vue';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import RoomAvailabilityStrip from './room-popup/RoomAvailabilityStrip.vue';
import RoomPopupActions from './room-popup/RoomPopupActions.vue';
import RoomDetailsCollapse from './room-popup/RoomDetailsCollapse.vue';
import RoomPopupHeader from './room-popup/RoomPopupHeader.vue';
import RoomSlotDetail from './room-popup/RoomSlotDetail.vue';

const props = defineProps<{
  open?: boolean;
  space: Space;
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  reserveDisabled?: boolean;
  reserveDisabledReason?: string | null;
  blockingReason?: string | null;
  loadingReservationState?: boolean;
  blockingAllowed?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  reserve: [range: { startTime: string; endTime: string }];
  block: [];
}>();

const router = useRouter();
const route = useRoute();
const overlayReady = ref(false);
const detailsExpanded = ref(false);
const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
onMounted(() => setTimeout(() => { overlayReady.value = true; }, 300));

const mediaQuery = window.matchMedia('(min-width: 768px)');
const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
  isDesktop.value = event.matches;
};

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleMediaChange);
});

function handleOpenChange(open: boolean) {
  if (!open && overlayReady.value) emit('close');
}

const { canReserve, canBlock, canViewReports } = usePermissions();

// Shared room-detail wiring (also used by SpaceCard). RoomPopup fetches its own
// availability (no `availability` passed → internal fetch on mount/date change).
const {
  visibleSlots,
  selectedSlot,
  hasUserSelection,
  reserveStartTime,
  reserveEndTime,
  reserveRangeBookable,
  clearSelection,
  isPastSlot,
  isInSelectedRange,
  onCellClick,
  getCellClass,
  loadingAvailability,
  equipmentGroups,
  groupStatusClass,
  groupStatusLabel,
  reportingEquipment,
  canReport,
  openReportFor,
  onReportSent,
  typeLabel,
  purposeLabel,
  blockTypeLabel,
  formattedDate,
} = useRoomDetail({
  space: () => props.space,
  selectedDate: toRef(props, 'selectedDate'),
  defaultStartTime: () => props.selectedStartTime,
  defaultEndTime: () => props.selectedEndTime,
});

const actionReserveRangeBookable = computed(() => loadingAvailability.value || reserveRangeBookable.value);

function emitReserve() {
  emit('reserve', { startTime: reserveStartTime.value, endTime: reserveEndTime.value });
}

function goToReservation(reservationId: string) {
  router.push({ name: 'my-reservations', query: { highlight: reservationId } });
}

function goToReport() {
  // Carry the viewer context so the report's back button can return to this pin's
  // popup (via ?space=<modelId>) instead of a generic viewer reload.
  router.push({
    name: 'space-report',
    params: { spaceId: props.space.id },
    query: {
      fromCampus: route.params.campusId as string,
      ...(props.space.modelId ? { fromModel: props.space.modelId } : {}),
    },
  });
}

</script>

<template>
  <component :is="isDesktop ? Dialog : Drawer" :open="open ?? true" @update:open="handleOpenChange">
    <component
      :is="isDesktop ? DialogContent : DrawerContent"
      class="room-popup z-[var(--z-modal)]"
      :class="isDesktop
        ? 'top-auto! bottom-[7dvh]! translate-y-0! max-h-[86dvh]! overflow-y-auto'
        : 'overflow-hidden rounded-xl mx-2 mb-[calc(0.5rem_+_var(--safe-bottom))]'"
      overlay-class="supports-backdrop-filter:backdrop-blur-none"
      :show-close-button="false"
    >
      <!-- On mobile this is the scroll region; on the desktop dialog it's
           layout-transparent (display:contents) so nothing about that path changes.
           Keeping the scroller a child of the drawer (not its root) lets vaul tell
           drag-to-dismiss apart from content scrolling. -->
      <div class="room-popup__scroll" :class="{ 'room-popup__scroll--flat': isDesktop }">
      <!-- Header -->
      <RoomPopupHeader
        :space="space"
        :type-label="typeLabel"
        :is-desktop="isDesktop"
        @close="$emit('close')"
      />

      <!-- Schedule grid -->
      <RoomAvailabilityStrip
        :formatted-date="formattedDate"
        :loading="loadingAvailability"
        :visible-slots="visibleSlots"
        :selected-date="selectedDate"
        :has-user-selection="hasUserSelection"
        :reserve-start-time="reserveStartTime"
        :reserve-end-time="reserveEndTime"
        :is-past-slot="isPastSlot"
        :is-in-selected-range="isInSelectedRange"
        :get-cell-class="getCellClass"
        @cell-click="onCellClick"
        @clear-selection="clearSelection"
      />

      <!-- Slot detail -->
      <RoomSlotDetail
        :selected-slot="selectedSlot"
        :purpose-label="purposeLabel"
        :block-type-label="blockTypeLabel"
        @go-to-reservation="goToReservation"
      />

      <RoomDetailsCollapse
        :details-expanded="detailsExpanded"
        :space="space"
        :equipment-groups="equipmentGroups"
        :can-report="canReport"
        :group-status-class="groupStatusClass"
        :group-status-label="groupStatusLabel"
        @toggle="detailsExpanded = !detailsExpanded"
        @report="openReportFor"
      />

      <!-- Blocking reason -->
      <div v-if="blockingReason" class="room-popup__notice">
        <p class="room-popup__notice-label">Motivo do bloqueio</p>
        <p class="room-popup__notice-text">{{ blockingReason }}</p>
      </div>

      <RoomPopupActions
        :can-reserve="canReserve"
        :can-block="canBlock"
        :can-view-reports="canViewReports"
        :reserve-disabled="reserveDisabled"
        :loading-reservation-state="loadingReservationState"
        :reserve-range-bookable="actionReserveRangeBookable"
        :reserve-start-time="reserveStartTime"
        :reserve-end-time="reserveEndTime"
        :reserve-disabled-reason="reserveDisabledReason"
        :blocking-allowed="blockingAllowed"
        @reserve="emitReserve"
        @block="$emit('block')"
        @report="goToReport"
      />
      </div>
    </component>

    <EquipmentReportDialog
      v-if="reportingEquipment"
      :equipment="reportingEquipment"
      :space-name="space.name"
      @close="reportingEquipment = null"
      @reported="onReportSent"
    />
  </component>
</template>

<!-- Non-scoped: targets the vaul drawer element (it carries the .room-popup class
     but NOT this component's data-v, so a scoped rule can't reach it). vaul adds a
     [data-vaul-drawer]::after overscroll spacer (top:100%, height:200%). Because we
     make the drawer body scrollable (overflow-y-auto), that absolutely-positioned
     spacer would otherwise become ~2x drawer-height of blank scrollable space below
     the content. Remove it for this drawer only. -->
<style>
.room-popup[data-vaul-drawer]::after { content: none !important; }
</style>

<style scoped>
.room-popup {
  background: var(--popover);
  border-radius: 20px;
  padding: 1.5rem 1.5rem 1.25rem;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgb(var(--shadow-color) / 0.18);
  position: relative;
  padding-bottom: calc(1.5rem + var(--safe-bottom, 0px));
}

/* Desktop dialog entrance + exit, keyed to reka-ui's data-state so the popup
   springs in AND eases out (reka keeps it mounted until the close animation
   ends). The mobile drawer ignores these — vaul owns its slide — and the
   global reduced-motion kill-switch collapses both to ~instant. */
.room-popup[data-state="open"] {
  animation: popup-in 0.34s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
}
.room-popup[data-state="closed"] {
  animation: popup-out 0.18s ease-in both;
}

.room-popup::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

/* Drawer variant (mobile): vaul-vue's portal does NOT forward this component's
   scoped data-v attribute to the sheet element, so none of the .room-popup
   *container* rules above (padding, max-width, radius, the ::before handle,
   the popup-in animation) reach it — they only style the slotted content, which
   keeps its data-v. The drawer's container layout (padding + scroll) is therefore
   applied via global Tailwind utilities on the component in the template instead.
   vaul itself supplies the bottom anchor, slide-in, rounded top, and grab handle. */

/* Desktop dialog is anchored near the bottom (see template class) so expanding
   the details grows it upward instead of overflowing off-screen; it stays
   horizontally centered via translateX(-50%), and the keyframes keep that -50%
   so the spring can't shove the popup sideways while it rises/settles. The
   mobile drawer never matches these (vaul owns its slide, no `data-state`). */
@keyframes popup-in {
  from { opacity: 0; transform: translate(-50%, 28px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes popup-out {
  from { opacity: 1; transform: translate(-50%, 0) scale(1); }
  to { opacity: 0; transform: translate(-50%, 12px) scale(0.97); }
}

/* Mobile drawer body scroller. The vaul root stays a fixed-height, non-scrolling
   drag surface (grab handle + clipped corners); this child owns the scroll. That
   keeps tall expanded "Mais detalhes" content from being clipped by flex-shrink
   and lets vaul distinguish drag-to-dismiss from scrolling. On desktop the wrapper
   collapses to display:contents so the dialog path is unchanged. */
.room-popup__scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 1.5rem 1.5rem;
}
.room-popup__scroll--flat {
  display: contents;
}

/* Blocking notice */
.room-popup__notice { margin-bottom: 0.75rem; padding: 0.7rem 0.9rem; border-radius: 10px; background: var(--warning-surface); border: 1px solid var(--warning-border); }
.room-popup__notice-label { margin: 0 0 0.2rem; color: var(--warning); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
.room-popup__notice-text { margin: 0; color: var(--warning); font-size: 0.82rem; }

</style>
