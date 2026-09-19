import { describe, it, expect } from 'vitest';
import { formatCurrencyForSpeech } from '../src/utils/accessibilityUtils';

describe('Accessibility Utilities', () => {
  describe('formatCurrencyForSpeech', () => {
    it('formats integer rupees clearly', () => {
      expect(formatCurrencyForSpeech(500, 'INR')).toBe('500 rupees');
      expect(formatCurrencyForSpeech(1000, 'INR')).toBe('1,000 rupees');
    });

    it('formats rupees with paise correctly', () => {
      expect(formatCurrencyForSpeech(1250.5, 'INR')).toBe('1,250 rupees and 50 paise');
      expect(formatCurrencyForSpeech(99.25, 'INR')).toBe('99 rupees and 25 paise');
    });

    it('handles zero or NaN amounts safely', () => {
      expect(formatCurrencyForSpeech(0, 'INR')).toBe('0 rupees');
      expect(formatCurrencyForSpeech(NaN, 'INR')).toBe('zero rupees');
    });
  });
});
