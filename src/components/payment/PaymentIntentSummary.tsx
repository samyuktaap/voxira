import React from 'react';
import { ShieldCheck, Volume2, XCircle, ArrowRight, User, DollarSign } from 'lucide-react';
import type { PaymentIntentResponse } from '../../types/payment';
import { formatCurrencyForSpeech } from '../../utils/accessibilityUtils';

interface PaymentIntentSummaryProps {
  transaction: PaymentIntentResponse;
  onConfirm: () => void;
  onCancel: () => void;
  onRepeat: () => void;
  isProcessing?: boolean;
}

export const PaymentIntentSummary: React.FC<PaymentIntentSummaryProps> = ({
  transaction,
  onConfirm,
  onCancel,
  onRepeat,
  isProcessing = false,
}) => {
  return (
    <div
      role="region"
      aria-label="Payment Review Summary"
      className="card-container w-full max-w-xl mx-auto bg-zinc-900 border-2 border-yellow-400 rounded-3xl p-6 shadow-2xl space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-yellow-400">
          <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-wide">Review Payment</h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold">
          ID: {transaction.transaction_id}
        </span>
      </div>

      <div className="space-y-4">
        {/* Recipient */}
        <div className="p-4 bg-zinc-800/80 rounded-2xl border border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-yellow-400">
              <User className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Paying Recipient
              </span>
              <span className="text-lg font-bold text-white">{transaction.recipient_name}</span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="p-4 bg-zinc-800/80 rounded-2xl border border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400">
              <DollarSign className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Amount
              </span>
              <span className="text-2xl font-black text-yellow-400">
                ₹{transaction.amount.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-zinc-400 block mt-0.5">
                ({formatCurrencyForSpeech(transaction.amount, transaction.currency)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spoken instructions */}
      <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/60 text-xs text-zinc-300 flex items-center justify-between">
        <span>Say "Confirm payment" or click Authenticate below.</span>
        <button
          onClick={onRepeat}
          aria-label="Repeat payment summary aloud"
          className="accessible-target text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-bold text-xs"
        >
          <Volume2 className="w-4 h-4" aria-hidden="true" />
          <span>Read Aloud</span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Cancel this transaction"
          className="accessible-target px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl border-2 border-zinc-600 flex items-center justify-center gap-2"
        >
          <XCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
          <span>Cancel</span>
        </button>

        <button
          onClick={onConfirm}
          disabled={isProcessing}
          aria-label="Authenticate and confirm payment"
          className="accessible-target px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-2xl shadow-xl flex items-center justify-center gap-2"
        >
          <span>Authenticate</span>
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
