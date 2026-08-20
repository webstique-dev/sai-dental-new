/**
 * Global enforcement utility to disable browser autocomplete, autofill popups,
 * and previous value suggestions across all forms, input fields, and textareas.
 */

export function setupGlobalAutocompleteDisable() {
  function disableField(el) {
    if (!el || !el.tagName) return;
    const tag = el.tagName.toLowerCase();

    if (tag === 'form') {
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('aria-autocomplete', 'none');
      return;
    }

    if (tag === 'input' || tag === 'textarea') {
      const type = el.type ? el.type.toLowerCase() : '';

      el.setAttribute('autocomplete', 'off');
      el.setAttribute('aria-autocomplete', 'none');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'none');
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('data-lpignore', 'true');
      el.setAttribute('data-form-type', 'other');

      if (type === 'password') {
        el.setAttribute('autocomplete', 'new-password');
      }
    }
  }

  function applyToAll() {
    const forms = document.querySelectorAll('form');
    forms.forEach(disableField);

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(disableField);
  }

  // Initial execution
  applyToAll();

  // Handle focus events
  const handleFocus = (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'FORM')) {
      disableField(e.target);
    }
  };
  document.addEventListener('focusin', handleFocus, true);

  // Handle DOM mutations for dynamically loaded components, modals, and pages
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'FORM') {
            disableField(node);
          }
          if (node.querySelectorAll) {
            const subNodes = node.querySelectorAll('input, textarea, form');
            subNodes.forEach(disableField);
          }
        }
      });
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    document.removeEventListener('focusin', handleFocus, true);
    observer.disconnect();
  };
}
