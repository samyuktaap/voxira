import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Volume2, RefreshCw } from 'lucide-react';
import type { PaymentActionResponse } from '../../types/payment';

interface PaymentResultProps {
  result: PaymentActionResponse;
  onReset: () => void;
  onRepeat: () => void;
}

export const PaymentResult: React.FC<PaymentResultProps> = ({
  result,
  onReset,
  onRepeat,
}) => {
  const isSuccess = result.status === 'SUCCESS';
  const isBlocked = result.status === 'BLOCKED';

  return (
    <div
      role="region"
      aria-label="Payment Result"
      className={`card-container w-full max-w-xl mx-auto bg-zinc-900 border-2 rounded-3xl p-6 shadow-2xl space-y-6 ${
        isSuccess
          ? 'border-green-500'
          : isBlocked
          ? 'border-yellow-400'
          : 'border-red-500'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        {isSuccess ? (
          <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border-4 border-green-500">
            <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
          </div>
        ) : isBlocked ? (
          <div className="w-20 h-20 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center border-4 border-yellow-400">
            <AlertTriangle className="w-12 h-12" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border-4 border-red-500">
            <XCircle className="w-12 h-12" aria-hidden="true" />
          </div>
        )}

        <h2 className="text-2xl font-black text-white tracking-wide">
          {isSuccess ? 'Payment Successful' : isBlocked ? 'Payment Blocked' : 'Payment Failed'}
        </h2>

        <p className="text-sm md:text-base text-zinc-300 max-w-md">{result.message}</p>
      </div>

      <div className="p-4 bg-zinc-800/80 rounded-2xl border border-zinc-700 space-y-2 text-sm">
        <div className="flex justify-between py-1 border-b border-zinc-700">
          <span className="text-zinc-400">Transaction ID:</span>
          <span className="font-mono font-bold text-white">{result.transaction_id}</span>
        </div>
        {result.recipient_name && (
          <div className="flex justify-between py-1 border-b border-zinc-700">
            <span className="text-zinc-400">Recipient:</span>
            <span className="font-bold text-white">{result.recipient_name}</span>
          </div>
        )}
        {result.amount > 0 && (
          <div className="flex justify-between py-1 border-b border-zinc-700">
            <span className="text-zinc-400">Amount:</span>
            <span className="font-black text-yellow-400">₹{result.amount.toLocaleString('en-IN')}</span>
          </div>
        )}
        {result.completed_at && (
          <div className="flex justify-between py-1">
            <span className="text-zinc-400">Timestamp:</span>
            <span className="text-xs text-zinc-300">{new Date(result.completed_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onRepeat}
          aria-label="Repeat result details aloud"
          className="accessible-target px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-bold rounded-2xl border-2 border-zinc-600 flex items-center justify-center gap-2"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          <span>Read Result</span>
        </button>

        <button
          onClick={onReset}
          aria-label="Start a new transaction"
          className="accessible-target px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-2xl shadow-xl flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" aria-hidden="true" />
          <span>New Payment</span>
        </button>
      </div>
    </div>
  );
};
