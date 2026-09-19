import type { ParsedVoiceCommand } from '../types/voice';

// Word to number conversion mapping
const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  crore: 10000000,
};

/**
 * Converts English spoken numbers (e.g. "five hundred and fifty", "one thousand two hundred") into numeric value.
 */
export function wordsToNumber(phrase: string): number | null {
  const clean = phrase.toLowerCase().replace(/-/g, ' ').replace(/\band\b/g, '').trim();
  const words = clean.split(/\s+/);

  // If entire phrase is already numeric digits (e.g. "500" or "500.50")
  if (/^\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  let total = 0;
  let currentGroup = 0;
  let hasValidWord = false;

  for (const word of words) {
    if (/^\d+(\.\d+)?$/.test(word)) {
      currentGroup += parseFloat(word);
      hasValidWord = true;
      continue;
    }

    const val = WORD_NUMBERS[word];
    if (val === undefined) {
      continue;
    }

    hasValidWord = true;

    if (val === 100) {
      currentGroup = currentGroup === 0 ? 100 : currentGroup * 100;
    } else if (val >= 1000) {
      currentGroup = currentGroup === 0 ? 1 : currentGroup;
      total += currentGroup * val;
      currentGroup = 0;
    } else {
      currentGroup += val;
    }
  }

  if (!hasValidWord) return null;
  return total + currentGroup;
}

/**
 * Robust Voice Command Parser
 * Parses natural voice phrases and returns typed, structured intent data.
 */
export class VoiceCommandParser {
  /**
   * Parse a raw speech transcript into a structured payment command.
   */
  public static parse(transcript: string): ParsedVoiceCommand {
    const raw = transcript.trim();
    const lower = raw.toLowerCase();

    // 1. Navigation & Control Commands
    if (this.matchesExactOrPhrase(lower, ['help', 'what can i say', 'options', 'assistance'])) {
      return { intent: 'HELP', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['cancel', 'stop', 'abort', 'dismiss', 'quit'])) {
      return { intent: 'CANCEL', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['go back', 'back', 'previous', 'return'])) {
      return { intent: 'GO_BACK', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['confirm payment', 'confirm', 'proceed', 'yes pay', 'make payment', 'yes proceed'])) {
      return { intent: 'CONFIRM_PAYMENT', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['repeat', 'repeat details', 'repeat payment', 'read again', 'say again', 'what was that'])) {
      return { intent: 'REPEAT_DETAILS', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['check status', 'payment status', 'check my payment status', 'status of payment', 'what is the status'])) {
      return { intent: 'CHECK_STATUS', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['change amount', 'modify amount', 'different amount', 'edit amount'])) {
      return { intent: 'CHANGE_AMOUNT', currency: 'INR', raw_transcript: raw };
    }

    if (this.matchesExactOrPhrase(lower, ['change recipient', 'modify recipient', 'different person', 'send to someone else'])) {
      return { intent: 'CHANGE_RECIPIENT', currency: 'INR', raw_transcript: raw };
    }

    // 2. Payment Intent Parsing: "Pay 500 rupees to Ravi" / "Send 100 to Priya"
    const isPaymentTrigger =
      lower.startsWith('pay') ||
      lower.startsWith('send') ||
      lower.startsWith('transfer') ||
      lower.startsWith('give') ||
      lower.includes(' rupees to ') ||
      lower.includes(' rs to ');

    if (isPaymentTrigger) {
      return this.extractPaymentDetails(raw, lower);
    }

    // Default unknown command
    return {
      intent: 'UNKNOWN',
      currency: 'INR',
      raw_transcript: raw,
      ambiguous: true,
      ambiguity_reason: "I didn't understand that. Please say the amount and recipient, or say 'help'.",
    };
  }

  private static matchesExactOrPhrase(text: string, phrases: string[]): boolean {
    const clean = text.replace(/[.,?!]/g, '').trim();
    return phrases.some((p) => clean === p || clean.startsWith(`${p} `) || clean.endsWith(` ${p}`));
  }

  private static extractPaymentDetails(raw: string, lower: string): ParsedVoiceCommand {
    // Check for ambiguous trigger e.g. "Pay five", "Pay hundred", "Send to Ravi"
    const cleanText = lower.replace(/[.,?!]/g, '').trim();

    // Regex 1: Matches "pay/send/transfer [amount] (rupees/rs/inr) to [recipient]"
    // Support numeric digits: "pay 500 rupees to ravi"
    const digitPattern = /(?:pay|send|transfer|give)\s+(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|bucks)?\s+to\s+([a-zA-Z\s]+)/i;
    const digitMatch = raw.match(digitPattern);

    if (digitMatch) {
      const amount = parseFloat(digitMatch[1]);
      const recipient = digitMatch[2].trim();
      return {
        intent: 'CREATE_PAYMENT',
        amount,
        currency: 'INR',
        recipient_name: recipient,
        raw_transcript: raw,
      };
    }

    // Regex 2: Matches words representation: "pay five hundred rupees to ravi"
    const wordPattern = /(?:pay|send|transfer|give)\s+(.+?)\s+(?:rupees?|rs\.?|inr|bucks)\s+to\s+([a-zA-Z\s]+)/i;
    const wordMatch = raw.match(wordPattern);

    if (wordMatch) {
      const amountPart = wordMatch[1].trim();
      const recipient = wordMatch[2].trim();
      const computedAmount = wordsToNumber(amountPart);

      if (computedAmount !== null && computedAmount > 0) {
        return {
          intent: 'CREATE_PAYMENT',
          amount: computedAmount,
          currency: 'INR',
          recipient_name: recipient,
          raw_transcript: raw,
        };
      }
    }

    // Regex 3: Without "rupees" keyword: "send 250 to priya"
    const directPattern = /(?:pay|send|transfer|give)\s+(\d+(?:\.\d+)?)\s+to\s+([a-zA-Z\s]+)/i;
    const directMatch = raw.match(directPattern);
    if (directMatch) {
      return {
        intent: 'CREATE_PAYMENT',
        amount: parseFloat(directMatch[1]),
        currency: 'INR',
        recipient_name: directMatch[2].trim(),
        raw_transcript: raw,
      };
    }

    // Check for Ambiguous Command:
    // e.g. "pay five" or "send 500" without recipient
    const incompleteMatch = /(?:pay|send|transfer|give)\s+(.+)/i.exec(cleanText);
    if (incompleteMatch) {
      const remainder = incompleteMatch[1].trim();
      const candidateNum = wordsToNumber(remainder);

      if (candidateNum !== null) {
        return {
          intent: 'CREATE_PAYMENT',
          amount: candidateNum,
          currency: 'INR',
          raw_transcript: raw,
          ambiguous: true,
          ambiguity_reason: `You specified an amount of ${candidateNum} rupees, but did not specify a recipient. Please say: Pay ${candidateNum} rupees to [Name].`,
        };
      }

      // Check if they only said recipient without amount e.g. "pay ravi"
      if (!remainder.includes(' to ') && isNaN(Number(remainder))) {
        return {
          intent: 'CREATE_PAYMENT',
          recipient_name: remainder,
          currency: 'INR',
          raw_transcript: raw,
          ambiguous: true,
          ambiguity_reason: `You specified ${remainder}, but did not state the payment amount. Please say: Pay [amount] rupees to ${remainder}.`,
        };
      }
    }

    return {
      intent: 'UNKNOWN',
      currency: 'INR',
      raw_transcript: raw,
      ambiguous: true,
      ambiguity_reason: "I didn't understand the payment request. Please say: Pay [amount] rupees to [recipient].",
    };
  }
}
