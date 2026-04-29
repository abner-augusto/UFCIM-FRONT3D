<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const sheetBodyRef = ref<HTMLElement | null>(null);
const originalParent = ref<HTMLElement | null>(null);

function moveSearchBar() {
  const searchBar = document.getElementById('search-bar');
  if (searchBar && sheetBodyRef.value) {
    originalParent.value = searchBar.parentElement;
    sheetBodyRef.value.appendChild(searchBar);
  }
}

function returnSearchBar() {
  const searchBar = document.getElementById('search-bar');
  if (searchBar && originalParent.value) {
    originalParent.value.appendChild(searchBar);
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    setTimeout(moveSearchBar, 0);
  } else {
    returnSearchBar();
  }
});

onMounted(() => {
  if (props.open) {
    moveSearchBar();
  }
});

onUnmounted(() => {
  returnSearchBar();
});

const overlayReady = ref(false);
onMounted(() => setTimeout(() => { overlayReady.value = true; }, 300));

function onOverlayClick() {
  if (overlayReady.value) emit('close');
}

</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="search-sheet-overlay" @click.self="onOverlayClick">
      <div class="search-sheet">
        <div class="search-sheet__handle"></div>
        <button class="search-sheet__close" @click="$emit('close')" aria-label="Fechar">&times;</button>
        <div ref="sheetBodyRef" class="search-sheet__body">
          <!-- The #search-bar will be moved here via DOM manipulation -->
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 400;
  padding: 0;
}

.search-sheet {
  background: white;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + var(--safe-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  display: flex;
  flex-direction: column;
}

.search-sheet__handle {
  width: 36px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 1.25rem;
}

.search-sheet__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-sheet__body {
  margin-top: 0.5rem;
}

/* Transitions */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-active .search-sheet,
.sheet-leave-active .search-sheet {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sheet-enter-from .search-sheet,
.sheet-leave-to .search-sheet {
  transform: translateY(100%);
}

/* Ensure the search bar inside looks right */
:deep(#search-bar) {
  display: grid !important; /* Force display when moved */
  grid-template-columns: 1fr auto;
  gap: 8px;
  width: 100%;
}

:deep(#search-results) {
  /* When in the sheet, let it expand upwards or downwards differently? 
     Actually, UIManager sets position: absolute; bottom: calc(100% + 6px).
     That works fine in the sheet too.
  */
  max-height: 50vh;
}
</style>
