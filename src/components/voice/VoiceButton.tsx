import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import type { VoiceState } from '../../types/voice';

interface VoiceButtonProps {
  isListening: boolean;
  voiceState: VoiceState;
  onToggleListen: () => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  voiceState,
  onToggleListen,
  disabled = false,
}) => {
  const isProcessing = voiceState === 'PROCESSING' || voiceState === 'WAITING_FOR_BACKEND' || voiceState === 'SUBMITTING';

  const getButtonLabel = () => {
    if (disabled) return 'Microphone unavailable';
    if (isListening) return 'Stop listening. Active voice capture in progress.';
    if (isProcessing) return 'Processing transaction...';
    return 'Tap or press Space to speak a payment command.';
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Pulsing ring during active listening */}
        {isListening && (
          <span
            className="absolute inset-0 rounded-full bg-red-500/40 animate-ping"
            aria-hidden="true"
          />
        )}

        <button
          onClick={onToggleListen}
          disabled={disabled || isProcessing}
          aria-label={getButtonLabel()}
          aria-pressed={isListening}
          className={`accessible-target relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center transition-transform duration-150 active:scale-95 shadow-2xl focus:ring-4 focus:ring-yellow-400 focus:outline-none ${
            isListening
              ? 'bg-red-600 text-white border-4 border-white shadow-red-500/50'
              : isProcessing
              ? 'bg-amber-600 text-white cursor-wait animate-pulse'
              : 'bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-yellow-500 shadow-yellow-500/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isListening ? (
            <>
              <Square className="w-10 h-10 mb-1 fill-current" aria-hidden="true" />
              <span className="text-xs font-black tracking-wider uppercase">STOP</span>
            </>
          ) : isProcessing ? (
            <>
              <MicOff className="w-10 h-10 mb-1 animate-spin" aria-hidden="true" />
              <span className="text-xs font-black tracking-wider uppercase">WAIT</span>
            </>
          ) : (
            <>
              <Mic className="w-12 h-12 mb-1" aria-hidden="true" />
              <span className="text-xs font-black tracking-wider uppercase">SPEAK</span>
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-sm md:text-base font-semibold text-center text-zinc-300 max-w-xs">
        {isListening
          ? 'Listening... Speak your command clearly.'
          : isProcessing
          ? 'Contacting security engine...'
          : 'Tap microphone or press Space to speak.'}
      </p>
    </div>
  );
};
