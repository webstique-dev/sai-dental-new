import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, AlertCircle, Info, Trash2, LogOut, Save, RefreshCw, XCircle, MinusCircle, X, Loader2
} from 'lucide-react';

const VARIANT_CONFIGS = {
  delete: {
    icon: Trash2,
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  remove: {
    icon: MinusCircle,
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  cancel: {
    icon: XCircle,
    iconBg: 'bg-rose-100 text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  signout: {
    icon: LogOut,
    iconBg: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  logout: {
    icon: LogOut,
    iconBg: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  update: {
    icon: Save,
    iconBg: 'bg-blue-100 text-brand',
    confirmBtn: 'bg-brand hover:bg-brand-dark text-white',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 text-brand',
    confirmBtn: 'bg-brand hover:bg-brand-dark text-white',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  closeOnBackdrop = true,
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  if (!isOpen) return null;

  const isProcessing = loading || internalLoading;
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.danger;
  const IconComponent = config.icon;

  const handleConfirmClick = async () => {
    if (isProcessing) return;
    try {
      setInternalLoading(true);
      await onConfirm();
    } catch (err) {
      console.error('Confirmation action error:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !isProcessing) {
      onClose();
    }
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !mt-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col bg-surface overflow-hidden shadow-xl animate-in zoom-in-95 duration-150"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-3.5 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
              <IconComponent size={18} />
            </div>
            <h3 className="font-display text-base font-bold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg disabled:opacity-40 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body - uses flex flex-col gap-2.5 for clean, margin-free top spacing */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs text-ink-soft flex flex-col gap-2.5 leading-relaxed">
          {typeof message === 'string' ? <p className="text-xs text-ink-soft">{message}</p> : message}
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-bg/50 shrink-0">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2 font-semibold disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmClick}
            className={`btn-primary text-xs px-4 py-2 font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-60 ${config.confirmBtn}`}
          >
            {isProcessing && <Loader2 size={14} className="animate-spin" />}
            <span>{isProcessing ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
