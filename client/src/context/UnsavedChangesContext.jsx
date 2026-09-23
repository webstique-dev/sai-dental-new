import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnsavedChangesModal from '../components/common/UnsavedChangesModal.jsx';

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dirtySources, setDirtySources] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const isNavigatingRef = useRef(false);

  // Compute aggregate dirty state across all registered sources
  const isAnyDirty = Object.values(dirtySources).some(Boolean);

  const setDirty = useCallback((sourceId, isDirty) => {
    if (!sourceId) return;
    setDirtySources((prev) => {
      if (Boolean(prev[sourceId]) === Boolean(isDirty)) return prev;
      return { ...prev, [sourceId]: Boolean(isDirty) };
    });
  }, []);

  const clearDirty = useCallback((sourceId) => {
    if (!sourceId) return;
    setDirtySources((prev) => {
      if (!prev[sourceId]) return prev;
      const copy = { ...prev };
      delete copy[sourceId];
      return copy;
    });
  }, []);

  const clearAllDirty = useCallback(() => {
    setDirtySources({});
  }, []);

  // Clear dirty sources when location changes
  useEffect(() => {
    setDirtySources({});
    setShowConfirmModal(false);
    setPendingNavigation(null);
    isNavigatingRef.current = false;
  }, [location.pathname]);

  // Handle Browser tab refresh or closing tab
  useEffect(() => {
    if (!isAnyDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAnyDirty]);

  // Intercept all Link / Anchor clicks (Sidebar, Header, Back button, menu items)
  useEffect(() => {
    if (!isAnyDirty) return;

    const handleCaptureClick = (e) => {
      // Find closest anchor tag
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // If no href, or it's a hash/javascript link, ignore
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // If opening in a new tab / external target, ignore
      if (anchor.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;

      // Check if it's the exact same location
      const currentFullPath = window.location.pathname + window.location.search;
      if (href === currentFullPath || href === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      setPendingNavigation(() => () => {
        isNavigatingRef.current = true;
        navigate(href);
      });
      setShowConfirmModal(true);
    };

    document.addEventListener('click', handleCaptureClick, true);
    return () => {
      document.removeEventListener('click', handleCaptureClick, true);
    };
  }, [isAnyDirty, navigate]);

  // Intercept Browser Back / Forward buttons (popstate)
  useEffect(() => {
    if (!isAnyDirty) return;

    // Push a state so that popping it allows us to intercept without immediately leaving
    window.history.pushState({ unsavedGuard: true }, '', window.location.href);

    const handlePopState = () => {
      if (isNavigatingRef.current) return;

      // Re-push state so user remains on current consultation page
      window.history.pushState({ unsavedGuard: true }, '', window.location.href);

      setPendingNavigation(() => () => {
        isNavigatingRef.current = true;
        window.history.go(-2);
      });
      setShowConfirmModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAnyDirty]);

  const confirmLeave = useCallback((action) => {
    if (isAnyDirty) {
      setPendingNavigation(() => action);
      setShowConfirmModal(true);
    } else if (typeof action === 'function') {
      action();
    }
  }, [isAnyDirty]);

  const handleStay = useCallback(() => {
    setShowConfirmModal(false);
    setPendingNavigation(null);
  }, []);

  const handleDiscard = useCallback(() => {
    setShowConfirmModal(false);
    setDirtySources({});
    if (typeof pendingNavigation === 'function') {
      const action = pendingNavigation;
      setPendingNavigation(null);
      action();
    }
  }, [pendingNavigation]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty: isAnyDirty,
        setDirty,
        clearDirty,
        clearAllDirty,
        confirmLeave,
        showConfirmModal,
        handleStay,
        handleDiscard,
      }}
    >
      {children}
      <UnsavedChangesModal
        isOpen={showConfirmModal}
        onStay={handleStay}
        onDiscard={handleDiscard}
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  return context || {
    isDirty: false,
    setDirty: () => {},
    clearDirty: () => {},
    clearAllDirty: () => {},
    confirmLeave: (action) => { if (typeof action === 'function') action(); },
    showConfirmModal: false,
    handleStay: () => {},
    handleDiscard: () => {},
  };
}

export default UnsavedChangesContext;
