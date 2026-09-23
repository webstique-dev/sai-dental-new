import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

export default function UnsavedChangesModal({
  isOpen,
  onStay,
  onDiscard,
  title = 'You have unsaved changes. Leave without saving?',
  message = 'Your entered changes have not been saved yet. If you leave now, all unsaved modifications will be discarded.',
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-3 sm:p-4 backdrop-blur-sm overflow-hidden animate-in fade-in duration-150 !m-0 !mt-0"
      onClick={onStay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-modal-title"
    >
      <div
        className="card w-full max-w-md bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border/80 bg-surface">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 id="unsaved-modal-title" className="font-display text-base font-bold text-ink leading-snug">
                {title}
              </h3>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-bg transition-colors shrink-0 ml-2"
            title="Stay and continue editing"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 p-4 sm:p-5 bg-bg/40 border-t border-border/60">
          <button
            type="button"
            onClick={onDiscard}
            className="btn-secondary w-full sm:w-auto py-2 px-4 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 hover:border-rose-300 transition-colors"
          >
            Discard Changes and Leave
          </button>
          <button
            type="button"
            onClick={onStay}
            autoFocus
            className="btn-primary w-full sm:w-auto py-2 px-4 text-xs font-semibold shadow-sm"
          >
            Stay and Continue Editing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
