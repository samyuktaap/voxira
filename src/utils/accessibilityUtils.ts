/**
 * Accessibility utility functions for BlindPay
 */

/**
 * Format currency amount for clear, unambiguous screen reader & speech synthesis readout.
 * Example: 500 -> "500 Indian rupees"
 * Example: 1500.50 -> "1,500 rupees and 50 paise"
 */
export function formatCurrencyForSpeech(amount: number, currency = 'INR'): string {
  if (isNaN(amount)) return 'zero rupees';

  const rounded = Math.round(amount * 100) / 100;
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);

  let formatted = `${whole.toLocaleString('en-IN')} ${currency === 'INR' ? 'rupees' : currency}`;
  if (paise > 0) {
    formatted += ` and ${paise} paise`;
  }
  return formatted;
}

/**
 * Trigger an announcement to screen readers via dynamically created or updated live region.
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'assertive'): void {
  const containerId = priority === 'assertive' ? 'sr-announcer-assertive' : 'sr-announcer-polite';
  let element = document.getElementById(containerId);

  if (!element) {
    element = document.createElement('div');
    element.id = containerId;
    element.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.className = 'sr-only';
    document.body.appendChild(element);
  }

  // Clear briefly then reset to ensure screen reader triggers announcement
  element.textContent = '';
  setTimeout(() => {
    if (element) {
      element.textContent = message;
    }
  }, 50);
}

/**
 * Manages trap focus inside a modal or confirmation region.
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      lastElement.focus();
      event.preventDefault();
    }
  } else {
    if (document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  }
}
