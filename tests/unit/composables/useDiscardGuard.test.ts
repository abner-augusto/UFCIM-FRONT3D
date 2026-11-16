import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDiscardGuard } from '@/composables/useDiscardGuard';

describe('useDiscardGuard', () => {
  it('closes immediately when clean and unlocked', () => {
    const onDiscard = vi.fn();
    const isDirty = ref(false);
    const guard = useDiscardGuard({ isDirty, onDiscard });

    guard.handleOpenChange(false);
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(guard.discardDialogOpen.value).toBe(false);
    expect(guard.drawerDismissible.value).toBe(true);
  });

  it('does not prevent outside dismiss when clean', () => {
    const onDiscard = vi.fn();
    const guard = useDiscardGuard({ isDirty: false, onDiscard });
    const event = { preventDefault: vi.fn() } as unknown as Event;

    guard.handleOutsideDismiss(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(guard.discardDialogOpen.value).toBe(false);
  });

  it('opens confirmation and prevents outside dismiss when dirty', () => {
    const onDiscard = vi.fn();
    const isDirty = ref(true);
    const isDesktop = ref(false);
    const guard = useDiscardGuard({ isDirty, isDesktop, onDiscard });
    const event = { preventDefault: vi.fn() } as unknown as Event;

    expect(guard.drawerDismissible.value).toBe(false);
    expect(guard.drawerBind.value).toEqual({ dismissible: false });

    guard.handleOutsideDismiss(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(guard.discardDialogOpen.value).toBe(true);
    expect(onDiscard).not.toHaveBeenCalled();

    guard.keepEditing();
    expect(guard.discardDialogOpen.value).toBe(false);
    expect(onDiscard).not.toHaveBeenCalled();

    guard.requestClose();
    expect(guard.discardDialogOpen.value).toBe(true);

    guard.confirmDiscard();
    expect(guard.discardDialogOpen.value).toBe(false);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('blocks closing without prompt when locked or not closable', () => {
    const onDiscard = vi.fn();
    const isLocked = ref(true);
    const canClose = ref(true);
    const guard = useDiscardGuard({ isDirty: true, isLocked, canClose, onDiscard });
    const event = { preventDefault: vi.fn() } as unknown as Event;

    guard.handleOpenChange(false);
    guard.handleOutsideDismiss(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(guard.discardDialogOpen.value).toBe(false);
    expect(onDiscard).not.toHaveBeenCalled();

    isLocked.value = false;
    canClose.value = false;
    guard.requestClose();
    expect(guard.discardDialogOpen.value).toBe(false);
  });

  it('resets prompt when parent closes overlay externally and omits dismissible on desktop', async () => {
    const open = ref(true);
    const isDesktop = ref(true);
    const guard = useDiscardGuard({ isDirty: true, open, isDesktop, onDiscard: vi.fn() });

    expect(guard.drawerBind.value).toEqual({});
    guard.requestClose();
    expect(guard.discardDialogOpen.value).toBe(true);

    open.value = false;
    await nextTick();
    expect(guard.discardDialogOpen.value).toBe(false);
  });
});
