import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export interface UseDiscardGuardOptions {
  isDirty: MaybeRefOrGetter<boolean>;
  isLocked?: MaybeRefOrGetter<boolean>;
  canClose?: MaybeRefOrGetter<boolean>;
  open?: MaybeRefOrGetter<boolean>;
  isDesktop?: MaybeRefOrGetter<boolean>;
  onDiscard: () => void;
}

export function useDiscardGuard(options: UseDiscardGuardOptions) {
  const discardDialogOpen = ref(false);

  const locked = () => Boolean(toValue(options.isLocked));
  const closable = () => (options.canClose === undefined ? true : Boolean(toValue(options.canClose)));
  const dirty = () => Boolean(toValue(options.isDirty));

  if (options.open !== undefined) {
    watch(
      () => Boolean(toValue(options.open)),
      (isOpen) => {
        if (!isOpen) discardDialogOpen.value = false;
      },
    );
  }

  const drawerDismissible = computed(() => !locked() && closable() && !dirty());
  const drawerBind = computed(() =>
    toValue(options.isDesktop) ? {} : { dismissible: drawerDismissible.value },
  );

  function requestClose() {
    if (locked() || !closable()) return;
    if (dirty()) {
      discardDialogOpen.value = true;
      return;
    }
    options.onDiscard();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) requestClose();
  }

  function handleOutsideDismiss(event: Event) {
    if (locked() || !closable()) {
      event.preventDefault();
      return;
    }
    if (dirty()) {
      event.preventDefault();
      discardDialogOpen.value = true;
    }
  }

  function confirmDiscard() {
    discardDialogOpen.value = false;
    options.onDiscard();
  }

  function keepEditing() {
    discardDialogOpen.value = false;
  }

  return {
    discardDialogOpen,
    drawerDismissible,
    drawerBind,
    requestClose,
    handleOpenChange,
    handleOutsideDismiss,
    confirmDiscard,
    keepEditing,
  };
}
