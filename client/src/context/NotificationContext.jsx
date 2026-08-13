import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

const VARIANT_STYLES = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  error: {
    bg: 'bg-rose-50 border-rose-200 text-rose-900',
    icon: AlertTriangle,
    iconColor: 'text-rose-600',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: Info,
    iconColor: 'text-brand',
  },
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newNotification = { id, type, title, message, duration };

      setNotifications((prev) => [...prev, newNotification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (message, title = 'Success') => showNotification({ type: 'success', title, message }),
    [showNotification]
  );

  const showError = useCallback(
    (message, title = 'Error') => showNotification({ type: 'error', title, message }),
    [showNotification]
  );

  const showWarning = useCallback(
    (message, title = 'Warning') => showNotification({ type: 'warning', title, message }),
    [showNotification]
  );

  const showInfo = useCallback(
    (message, title = 'Notice') => showNotification({ type: 'info', title, message }),
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeNotification,
      }}
    >
      {children}

      {/* Floating Notification Toast Stack */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
        aria-live="polite"
      >
        {notifications.map((n) => {
          const style = VARIANT_STYLES[n.type] || VARIANT_STYLES.info;
          const IconComponent = style.icon;

          return (
            <div
              key={n.id}
              className={`pointer-events-auto w-full rounded-2xl border ${style.bg} p-3.5 shadow-xl flex items-start gap-3 transition-all duration-200 animate-in slide-in-from-top-4 fade-in`}
            >
              <IconComponent size={20} className={`${style.iconColor} shrink-0 mt-0.5`} />

              <div className="flex-1 min-w-0 pr-1">
                {n.title && <h4 className="text-xs font-bold font-display mb-0.5">{n.title}</h4>}
                <p className="text-xs font-medium leading-relaxed opacity-90 break-words">
                  {n.message}
                </p>
              </div>

              <button
                onClick={() => removeNotification(n.id)}
                className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition-opacity"
                aria-label="Close notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
