import { describe, it, expect } from 'vitest';
import { VoiceCommandParser, wordsToNumber } from '../src/services/voiceCommandParser';

describe('VoiceCommandParser', () => {
  describe('wordsToNumber conversion', () => {
    it('converts direct digits correctly', () => {
      expect(wordsToNumber('500')).toBe(500);
      expect(wordsToNumber('1250.50')).toBe(1250.5);
    });

    it('converts small numbers correctly', () => {
      expect(wordsToNumber('five')).toBe(5);
      expect(wordsToNumber('twenty five')).toBe(25);
    });

    it('converts composite numbers with hundred and thousand', () => {
      expect(wordsToNumber('five hundred')).toBe(500);
      expect(wordsToNumber('five hundred and fifty')).toBe(550);
      expect(wordsToNumber('one thousand two hundred')).toBe(1200);
    });
  });

  describe('Payment commands parsing', () => {
    it('parses valid numeric payment command: "Pay 500 rupees to Ravi"', () => {
      const result = VoiceCommandParser.parse('Pay 500 rupees to Ravi');
      expect(result.intent).toBe('CREATE_PAYMENT');
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('INR');
      expect(result.recipient_name?.toLowerCase()).toBe('ravi');
      expect(result.ambiguous).toBeFalsy();
    });

    it('parses word-based payment command: "Send five hundred rupees to Ravi"', () => {
      const result = VoiceCommandParser.parse('Send five hundred rupees to Ravi');
      expect(result.intent).toBe('CREATE_PAYMENT');
      expect(result.amount).toBe(500);
      expect(result.recipient_name?.toLowerCase()).toBe('ravi');
    });

    it('parses direct command without explicit rupees keyword: "Send 100 to Priya"', () => {
      const result = VoiceCommandParser.parse('Send 100 to Priya');
      expect(result.intent).toBe('CREATE_PAYMENT');
      expect(result.amount).toBe(100);
      expect(result.recipient_name?.toLowerCase()).toBe('priya');
    });

    it('flags ambiguous incomplete amount input: "Pay five"', () => {
      const result = VoiceCommandParser.parse('Pay five');
      expect(result.ambiguous).toBe(true);
      expect(result.ambiguity_reason).toBeDefined();
    });

    it('flags missing amount input: "Pay Ravi"', () => {
      const result = VoiceCommandParser.parse('Pay Ravi');
      expect(result.ambiguous).toBe(true);
    });
  });

  describe('System control commands', () => {
    it('parses cancellation command', () => {
      expect(VoiceCommandParser.parse('Cancel').intent).toBe('CANCEL');
      expect(VoiceCommandParser.parse('stop').intent).toBe('CANCEL');
    });

    it('parses repeat details command', () => {
      expect(VoiceCommandParser.parse('Repeat details').intent).toBe('REPEAT_DETAILS');
      expect(VoiceCommandParser.parse('say again').intent).toBe('REPEAT_DETAILS');
    });

    it('parses help command', () => {
      expect(VoiceCommandParser.parse('Help').intent).toBe('HELP');
    });

    it('parses confirm payment command', () => {
      expect(VoiceCommandParser.parse('Confirm payment').intent).toBe('CONFIRM_PAYMENT');
    });

    it('parses go back command', () => {
      expect(VoiceCommandParser.parse('Go back').intent).toBe('GO_BACK');
    });

    it('parses check status command', () => {
      expect(VoiceCommandParser.parse('Check my payment status').intent).toBe('CHECK_STATUS');
    });
  });
});
