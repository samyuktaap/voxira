import { describe, it, expect } from 'vitest';
import { validateVoicePaymentIntent, sanitizeTranscript } from '../src/utils/voiceValidation';

describe('Voice Intent Validation', () => {
  it('approves a valid payment intent', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 500,
      currency: 'INR',
      recipient_name: 'Ravi Kumar',
      raw_transcript: 'Pay 500 rupees to Ravi',
    });

    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects negative payment amounts', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: -100,
      currency: 'INR',
      recipient_name: 'Ravi',
      raw_transcript: 'Pay minus 100 rupees to Ravi',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Amount must be greater than zero.');
    expect(res.spokenError).toBeDefined();
  });

  it('rejects zero or missing payment amount', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      currency: 'INR',
      recipient_name: 'Ravi',
      raw_transcript: 'Pay to Ravi',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('Amount is missing') || e.includes('amount is missing'))).toBe(true);
  });

  it('rejects missing or empty recipient', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 500,
      currency: 'INR',
      recipient_name: '',
      raw_transcript: 'Pay 500 rupees',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Recipient name is missing.');
  });

  it('rejects recipient names with code/script injection characters', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 500,
      currency: 'INR',
      recipient_name: '<script>alert(1)</script>',
      raw_transcript: 'Pay 500 rupees to script',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('Recipient name contains invalid characters.');
  });

  it('rejects unsupported currencies', () => {
    const res = validateVoicePaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 500,
      currency: 'USD',
      recipient_name: 'Ravi',
      raw_transcript: 'Pay 500 dollars to Ravi',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('USD'))).toBe(true);
  });

  it('sanitizes transcripts properly', () => {
    const dirty = '  Pay 500 <script> rupees \u0007 to Ravi  ';
    const clean = sanitizeTranscript(dirty);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).toBe('Pay 500 script rupees  to Ravi');
  });
});
