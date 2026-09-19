import type { ParsedVoiceCommand } from '../types/voice';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  spokenError?: string;
}

export const MAX_VOICE_AMOUNT = 50000;
export const SUPPORTED_CURRENCIES = ['INR'];

/**
 * Authoritative client-side pre-validation.
 * Prevents garbage/malformed/unsafe payloads from ever leaving the browser.
 * The backend remains the ultimate authority for financial limits.
 */
export function validateVoicePaymentIntent(command: Partial<ParsedVoiceCommand>): ValidationResult {
  const errors: string[] = [];

  if (!command) {
    return {
      isValid: false,
      errors: ['No command provided.'],
      spokenError: 'I could not detect any payment command. Please try again.',
    };
  }

  // Check intent
  if (command.intent !== 'CREATE_PAYMENT') {
    errors.push(`Expected CREATE_PAYMENT intent, received: ${command.intent}`);
  }

  // Check amount existence and type
  if (command.amount === undefined || command.amount === null || isNaN(command.amount)) {
    errors.push('Payment amount is missing or not a valid number.');
  } else {
    // Check positive amount
    if (command.amount <= 0) {
      errors.push('Amount must be greater than zero.');
    }
    // Check maximum reasonable threshold
    if (command.amount > 100000000) {
      errors.push('Amount exceeds maximum permissible ceiling.');
    }
  }

  // Check recipient existence and format
  if (!command.recipient_name || command.recipient_name.trim().length === 0) {
    errors.push('Recipient name is missing.');
  } else {
    const cleanRecipient = command.recipient_name.trim();
    if (cleanRecipient.length < 2) {
      errors.push('Recipient name is too short (minimum 2 characters).');
    }
    if (cleanRecipient.length > 80) {
      errors.push('Recipient name is too long.');
    }
    // Disallow numbers or code injection in recipient name
    if (/[<>{}$%^*+=]/.test(cleanRecipient)) {
      errors.push('Recipient name contains invalid characters.');
    }
  }

  // Check currency
  const currency = (command.currency || 'INR').toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    errors.push(`Currency '${currency}' is not supported. Only INR is supported.`);
  }

  // Check raw transcript length
  if (!command.raw_transcript || command.raw_transcript.length > 500) {
    errors.push('Voice transcript is invalid or exceeds maximum length.');
  }

  let spokenError: string | undefined;
  if (errors.length > 0) {
    if (!command.amount || command.amount <= 0) {
      spokenError = 'Please specify a valid payment amount.';
    } else if (!command.recipient_name) {
      spokenError = 'Please tell me who you would like to send the money to.';
    } else {
      spokenError = 'The payment details are incomplete. Please say the amount and recipient again.';
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    spokenError,
  };
}

/**
 * Sanitize text to remove control characters and dangerous symbols.
 */
export function sanitizeTranscript(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[<>{}\\]/g, '')
    .trim();
}
