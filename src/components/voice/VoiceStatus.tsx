import React from 'react';
import {
  Mic,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  CreditCard,
  Volume2,
} from 'lucide-react';
import type { VoiceState } from '../../types/voice';

interface VoiceStatusProps {
  voiceState: VoiceState;
  statusMessage: string;
  errorMessage?: string | null;
  onRepeat?: () => void;
}

export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  voiceState,
  statusMessage,
  errorMessage,
  onRepeat,
}) => {
  const getBadgeStyle = () => {
    switch (voiceState) {
      case 'LISTENING':
        return 'bg-red-500 text-white border-red-400';
      case 'PROCESSING':
      case 'WAITING_FOR_BACKEND':
      case 'SUBMITTING':
        return 'bg-blue-600 text-white border-blue-400';
      case 'REVIEWING':
        return 'bg-yellow-500 text-black border-yellow-300 font-bold';
      case 'AUTHENTICATION_REQUIRED':
      case 'CONFIRMATION_REQUIRED':
        return 'bg-purple-600 text-white border-purple-400';
      case 'SUCCESS':
        return 'bg-green-600 text-white border-green-400';
      case 'ERROR':
        return 'bg-red-600 text-white border-red-400';
      case 'CANCELLED':
        return 'bg-zinc-700 text-zinc-200 border-zinc-500';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getIcon = () => {
    switch (voiceState) {
      case 'LISTENING':
        return <Mic className="w-5 h-5 animate-pulse" aria-hidden="true" />;
      case 'PROCESSING':
      case 'WAITING_FOR_BACKEND':
      case 'SUBMITTING':
        return <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />;
      case 'REVIEWING':
        return <CreditCard className="w-5 h-5" aria-hidden="true" />;
      case 'AUTHENTICATION_REQUIRED':
      case 'CONFIRMATION_REQUIRED':
        return <ShieldCheck className="w-5 h-5" aria-hidden="true" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5" aria-hidden="true" />;
      case 'ERROR':
        return <AlertTriangle className="w-5 h-5" aria-hidden="true" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5" aria-hidden="true" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-xl mx-auto rounded-2xl bg-zinc-900/90 border-2 border-zinc-800 p-4 md:p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${getBadgeStyle()}`}
          >
            {getIcon()}
            <span>{voiceState.replace(/_/g, ' ')}</span>
          </span>
        </div>

        {onRepeat && (
          <button
            onClick={onRepeat}
            aria-label="Repeat status details aloud"
            className="accessible-target flex items-center gap-1 text-xs font-bold text-yellow-400 hover:text-yellow-300 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>Repeat</span>
          </button>
        )}
      </div>

      <div className="mt-2 text-base md:text-lg font-medium text-white">
        {errorMessage ? (
          <div className="text-red-400 font-semibold flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <p>{statusMessage}</p>
        )}
      </div>
    </div>
  );
};
