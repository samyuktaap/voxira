import React from 'react';
import { ShieldCheck, Fingerprint, Lock, CheckCircle2, XCircle } from 'lucide-react';
import type { PaymentIntentResponse } from '../../types/payment';

interface PaymentConfirmationProps {
  transaction: PaymentIntentResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isAuthenticating?: boolean;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({
  transaction,
  onConfirm,
  onCancel,
  isAuthenticating = false,
}) => {
  return (
    <div
      role="region"
      aria-label="Device Authentication & Payment Confirmation"
      className="card-container w-full max-w-xl mx-auto bg-zinc-900 border-2 border-purple-400 rounded-3xl p-6 shadow-2xl space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-purple-400">
          <Lock className="w-6 h-6" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-wide">Device Authentication</h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-400/20 text-purple-300 font-mono font-bold">
          SECURITY VERIFICATION
        </span>
      </div>

      {/* Mandatory Fintech Security Boundary Notice */}
      <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-700/60 text-xs text-purple-200 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-purple-400 mt-0.5" aria-hidden="true" />
        <p>
          <strong className="font-bold text-white block mb-1">Security Boundary Active:</strong>
          Voice input alone NEVER authorizes money movement. The payment must be explicitly authenticated through your secure device sensor.
        </p>
      </div>

      {/* Simulated Device Sensor Button */}
      <div className="flex flex-col items-center justify-center p-6 bg-zinc-800/80 rounded-2xl border border-zinc-700 space-y-4">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
              isAuthenticating
                ? 'bg-purple-600/30 border-purple-400 animate-pulse'
                : 'bg-zinc-700 border-purple-400'
            }`}
          >
            <Fingerprint className="w-12 h-12 text-purple-300" aria-hidden="true" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="font-bold text-white text-base">Touch Device Sensor / Verify PIN</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Authorizing transfer of ₹{transaction.amount.toLocaleString('en-IN')} to {transaction.recipient_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isAuthenticating}
          aria-label="Cancel transaction"
          className="accessible-target px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl border-2 border-zinc-600 flex items-center justify-center gap-2"
        >
          <XCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
          <span>Cancel</span>
        </button>

        <button
          onClick={onConfirm}
          disabled={isAuthenticating}
          aria-label="Confirm payment authorization"
          className="accessible-target px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          <span>{isAuthenticating ? 'Verifying...' : 'Authorize Now'}</span>
        </button>
      </div>
    </div>
  );
};
