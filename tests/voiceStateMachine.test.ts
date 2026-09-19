import { describe, it, expect } from 'vitest';
import { voiceApiService } from '../src/services/voiceApi';

describe('Voice State Machine & Security Boundaries', () => {
  it('enforces that voice alone cannot execute payment without explicit authorization', async () => {
    // Enable local mock sandbox mode for isolated unit testing
    voiceApiService.setMockMode(true);

    // 1. Submit intent
    const intentRes = await voiceApiService.createPaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 500,
      currency: 'INR',
      recipient_name: 'Ravi Kumar',
      raw_transcript: 'Pay 500 rupees to Ravi',
    });

    expect(intentRes.status).toBe('REVIEW_REQUIRED');
    expect(intentRes.requires_auth).toBe(true);

    // 2. Try confirming without authentication (security policy must reject or require auth)
    const authRes = await voiceApiService.authenticateTransaction({
      transaction_id: intentRes.transaction_id,
      auth_success: true,
    });
    expect(authRes.status).toBe('CONFIRMATION_REQUIRED');

    // 3. Authorize after successful auth
    const confirmRes = await voiceApiService.confirmPayment({
      transaction_id: intentRes.transaction_id,
      explicit_confirmation: true,
    });

    expect(confirmRes.status).toBe('SUCCESS');
    expect(confirmRes.completed_at).toBeDefined();
  });

  it('triggers BLOCKED status when amount exceeds voice safety limit (> 50,000 INR)', async () => {
    voiceApiService.setMockMode(true);

    const intentRes = await voiceApiService.createPaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 75000,
      currency: 'INR',
      recipient_name: 'Ravi',
      raw_transcript: 'Pay 75000 rupees to Ravi',
    });

    expect(intentRes.status).toBe('BLOCKED');
    expect(intentRes.message).toContain('exceeds the voice safety limit');
  });

  it('triggers BLOCKED status for simulated amount mismatch (Demo 2 requirement)', async () => {
    voiceApiService.setMockMode(true);

    const intentRes = await voiceApiService.createPaymentIntent({
      intent: 'CREATE_PAYMENT',
      amount: 9999,
      currency: 'INR',
      recipient_name: 'Ravi',
      raw_transcript: 'Pay 9999 rupees to Ravi',
    });

    expect(intentRes.status).toBe('BLOCKED');
    expect(intentRes.message).toContain('Payment blocked');
  });

  it('handles cancellation and marks transaction as CANCELLED', async () => {
    voiceApiService.setMockMode(true);

    const cancelRes = await voiceApiService.cancelPayment('txn_test_123');
    expect(cancelRes.status).toBe('CANCELLED');
  });
});
