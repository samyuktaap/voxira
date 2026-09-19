import { useState, useCallback } from 'react';
import type { VoiceState, ParsedVoiceCommand } from '../types/voice';
import type { PaymentIntentResponse, PaymentActionResponse } from '../types/payment';
import { VoiceCommandParser } from '../services/voiceCommandParser';
import { validateVoicePaymentIntent } from '../utils/voiceValidation';
import { formatCurrencyForSpeech, announceToScreenReader } from '../utils/accessibilityUtils';
import { voiceApiService } from '../services/voiceApi';
import { speechSynthesisService } from '../services/speechSynthesis';
import { accessibilityService } from '../services/accessibilityService';

export function useVoiceCommand() {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [transaction, setTransaction] = useState<PaymentIntentResponse | null>(null);
  const [finalResult, setFinalResult] = useState<PaymentActionResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready. Click the microphone or speak a command.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Speak aloud and announce to screen readers simultaneously.
   */
  const speakAndAnnounce = useCallback((text: string, assertive = false) => {
    setStatusMessage(text);
    announceToScreenReader(text, assertive ? 'assertive' : 'polite');
    speechSynthesisService.speak(text);
  }, []);

  /**
   * Reset the voice interaction flow back to IDLE.
   */
  const resetFlow = useCallback(() => {
    speechSynthesisService.stop();
    setVoiceState('IDLE');
    setParsedCommand(null);
    setTransaction(null);
    setFinalResult(null);
    setErrorMessage(null);
    setStatusMessage('Ready for next payment command.');
    announceToScreenReader('System ready for next command.');
  }, []);

  /**
   * Cancel the current in-flight payment flow.
   */
  const cancelFlow = useCallback(async () => {
    if (transaction?.transaction_id) {
      await voiceApiService.cancelPayment(transaction.transaction_id);
    }
    setVoiceState('CANCELLED');
    accessibilityService.playListenStop();
    const msg = 'Payment cancelled. Returning to main menu.';
    speakAndAnnounce(msg);
    setTimeout(() => {
      resetFlow();
    }, 2500);
  }, [transaction, resetFlow, speakAndAnnounce]);

  /**
   * Repeat current details or last spoken status.
   */
  const repeatDetails = useCallback(() => {
    if (voiceState === 'REVIEWING' && transaction) {
      const speech = `You are about to pay ${formatCurrencyForSpeech(transaction.amount, transaction.currency)} to ${transaction.recipient_name}. Say 'Confirm payment' to proceed, or 'Cancel' to abort.`;
      speakAndAnnounce(speech);
    } else if (voiceState === 'AUTHENTICATION_REQUIRED') {
      const speech = 'Please complete device authentication to authorize this transaction.';
      speakAndAnnounce(speech);
    } else if (voiceState === 'CONFIRMATION_REQUIRED' && transaction) {
      const speech = `Authentication successful. You are paying ${formatCurrencyForSpeech(transaction.amount, transaction.currency)} to ${transaction.recipient_name}. Say 'Confirm payment' to finish.`;
      speakAndAnnounce(speech);
    } else {
      speechSynthesisService.repeatLast();
    }
  }, [voiceState, transaction, speakAndAnnounce]);

  /**
   * Core pipeline: Ingest transcript and transition through the state machine.
   */
  const handleTranscript = useCallback(
    async (rawText: string) => {
      if (!rawText.trim()) return;

      setVoiceState('PROCESSING');
      setErrorMessage(null);

      // 1. Parse command
      const parsed = VoiceCommandParser.parse(rawText);
      setParsedCommand(parsed);

      // Handle Immediate Global Navigation Commands
      if (parsed.intent === 'CANCEL') {
        await cancelFlow();
        return;
      }

      if (parsed.intent === 'REPEAT_DETAILS') {
        repeatDetails();
        return;
      }

      if (parsed.intent === 'HELP') {
        const helpMsg =
          "You can say: 'Pay 500 rupees to Ravi', 'Repeat details', 'Cancel', or 'Check payment status'.";
        speakAndAnnounce(helpMsg);
        setVoiceState('IDLE');
        return;
      }

      if (parsed.intent === 'CONFIRM_PAYMENT') {
        // Confirmation is valid only when in CONFIRMATION_REQUIRED or REVIEWING state
        if (voiceState === 'CONFIRMATION_REQUIRED' && transaction) {
          await submitFinalPayment(transaction.transaction_id);
          return;
        } else if (voiceState === 'REVIEWING' && transaction) {
          // Trigger simulated device authentication step first!
          await triggerDeviceAuthentication(transaction.transaction_id);
          return;
        } else {
          speakAndAnnounce('There is no active transaction awaiting confirmation. Please state a payment command first.');
          setVoiceState('IDLE');
          return;
        }
      }

      // Handle Ambiguous speech
      if (parsed.ambiguous || parsed.intent === 'UNKNOWN') {
        setVoiceState('ERROR');
        accessibilityService.playError();
        const clarify = parsed.ambiguity_reason || "I didn't catch that. Please state the amount and recipient.";
        setErrorMessage(clarify);
        speakAndAnnounce(clarify, true);
        return;
      }

      // 2. Validate Payment Intent
      if (parsed.intent === 'CREATE_PAYMENT') {
        const validation = validateVoicePaymentIntent(parsed);
        if (!validation.isValid) {
          setVoiceState('ERROR');
          accessibilityService.playError();
          const errText = validation.spokenError || validation.errors[0];
          setErrorMessage(errText);
          speakAndAnnounce(errText, true);
          return;
        }

        // 3. Send to Backend API
        setVoiceState('WAITING_FOR_BACKEND');
        setStatusMessage('Verifying transaction details with backend...');
        announceToScreenReader('Verifying transaction details with backend...');

        try {
          const backendTxn = await voiceApiService.createPaymentIntent({
            intent: parsed.intent,
            amount: parsed.amount!,
            currency: parsed.currency,
            recipient_name: parsed.recipient_name!,
            raw_transcript: parsed.raw_transcript,
          });

          setTransaction(backendTxn);

          // Handle Backend Security Policy Status
          if (backendTxn.status === 'BLOCKED') {
            setVoiceState('ERROR');
            accessibilityService.playBlocked();
            const blockedSpeech = `${backendTxn.message} No payment was executed.`;
            setErrorMessage(backendTxn.message);
            speakAndAnnounce(blockedSpeech, true);
            return;
          }

          // Move to REVIEWING
          setVoiceState('REVIEWING');
          const readout = `You are about to pay ${formatCurrencyForSpeech(backendTxn.amount, backendTxn.currency)} to ${backendTxn.recipient_name}. Say 'Confirm payment' to authenticate and proceed, or say 'Cancel'.`;
          speakAndAnnounce(readout);
        } catch (err: unknown) {
          setVoiceState('ERROR');
          accessibilityService.playError();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg = (err as any)?.message || 'Unable to connect to payment server. Please try again.';
          setErrorMessage(msg);
          speakAndAnnounce(msg, true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceState, transaction, cancelFlow, repeatDetails, speakAndAnnounce]
  );

  /**
   * Device Authentication Simulation step
   */
  const triggerDeviceAuthentication = async (txnId: string) => {
    setVoiceState('AUTHENTICATION_REQUIRED');
    const authPrompt = 'Please authenticate using your device sensor or PIN to authorize this payment.';
    speakAndAnnounce(authPrompt);

    // Simulate device authentication challenge
    setTimeout(async () => {
      try {
        const authRes = await voiceApiService.authenticateTransaction({
          transaction_id: txnId,
          auth_method: 'device_biometric_simulation',
          auth_success: true,
        });

        if (authRes.status === 'CONFIRMATION_REQUIRED') {
          setVoiceState('CONFIRMATION_REQUIRED');
          const readyToConfirm = 'Device authentication verified. Say or click Confirm payment to complete transfer.';
          speakAndAnnounce(readyToConfirm);
        } else {
          setVoiceState('ERROR');
          accessibilityService.playError();
          speakAndAnnounce(authRes.message, true);
        }
      } catch (err) {
        setVoiceState('ERROR');
        accessibilityService.playError();
        speakAndAnnounce('Device authentication failed. Payment cancelled.', true);
      }
    }, 1500);
  };

  /**
   * Authoritative Final Confirmation
   */
  const submitFinalPayment = async (txnId: string) => {
    setVoiceState('SUBMITTING');
    const subPrompt = 'Submitting authorized payment to the banking network...';
    setStatusMessage(subPrompt);
    announceToScreenReader(subPrompt);

    try {
      const result = await voiceApiService.confirmPayment({
        transaction_id: txnId,
        explicit_confirmation: true,
      });

      setFinalResult(result);

      if (result.status === 'SUCCESS') {
        setVoiceState('SUCCESS');
        accessibilityService.playSuccess();
        const successMessage = `Payment successful! ${formatCurrencyForSpeech(result.amount, result.currency)} has been sent to ${result.recipient_name}.`;
        speakAndAnnounce(successMessage);
      } else {
        setVoiceState('ERROR');
        accessibilityService.playError();
        speakAndAnnounce(result.message || 'Payment could not be completed.', true);
      }
    } catch (err: unknown) {
      setVoiceState('ERROR');
      accessibilityService.playError();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Payment execution failed.';
      speakAndAnnounce(msg, true);
    }
  };

  return {
    voiceState,
    setVoiceState,
    parsedCommand,
    transaction,
    finalResult,
    statusMessage,
    errorMessage,
    handleTranscript,
    triggerDeviceAuthentication,
    submitFinalPayment,
    cancelFlow,
    repeatDetails,
    resetFlow,
    speakAndAnnounce,
  };
}
