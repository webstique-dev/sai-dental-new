import { useState, useEffect, useCallback, useId } from 'react';
import { useUnsavedChangesContext } from '../context/UnsavedChangesContext.jsx';

export function useUnsavedChanges(initialDirty = false, customSourceId = null) {
  const generatedId = useId();
  const sourceId = customSourceId || generatedId;
  const { setDirty: setGlobalDirty, clearDirty: clearGlobalDirty } = useUnsavedChangesContext();

  const [isDirty, setIsDirty] = useState(Boolean(initialDirty));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Sync incoming dirty flag changes
  useEffect(() => {
    const dirty = Boolean(initialDirty);
    setIsDirty(dirty);
    setGlobalDirty(sourceId, dirty);
  }, [initialDirty, sourceId, setGlobalDirty]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearGlobalDirty(sourceId);
    };
  }, [sourceId, clearGlobalDirty]);

  // Browser refresh or tab close warning
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const updateDirty = useCallback((dirty) => {
    const boolVal = Boolean(dirty);
    setIsDirty(boolVal);
    setGlobalDirty(sourceId, boolVal);
  }, [sourceId, setGlobalDirty]);

  /**
   * Guards an action (navigation, modal close, tab switch).
   * If form is dirty, opens confirmation modal.
   * If not dirty, executes the action immediately.
   */
  const confirmLeave = useCallback((action) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowConfirmModal(true);
    } else if (typeof action === 'function') {
      action();
    }
  }, [isDirty]);

  /**
   * User chooses "Stay and Continue Editing"
   */
  const handleStay = useCallback(() => {
    setShowConfirmModal(false);
    setPendingAction(null);
  }, []);

  /**
   * User chooses "Discard Changes and Leave"
   */
  const handleDiscard = useCallback(() => {
    setShowConfirmModal(false);
    updateDirty(false);
    if (typeof pendingAction === 'function') {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  }, [pendingAction, updateDirty]);

  /**
   * Resets dirty flag (e.g. after successful save)
   */
  const resetDirty = useCallback(() => {
    updateDirty(false);
    setShowConfirmModal(false);
    setPendingAction(null);
  }, [updateDirty]);

  return {
    isDirty,
    setIsDirty: updateDirty,
    showConfirmModal,
    confirmLeave,
    handleStay,
    handleDiscard,
    resetDirty,
  };
}

export default useUnsavedChanges;

