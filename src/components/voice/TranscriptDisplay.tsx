import React, { useState } from 'react';
import { Send, Keyboard, MessageSquare, RotateCcw } from 'lucide-react';

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  onSubmitTextCommand: (text: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  interimTranscript,
  onSubmitTextCommand,
  onClear,
  disabled = false,
}) => {
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualText.trim()) {
      onSubmitTextCommand(manualText.trim());
      setManualText('');
    }
  };

  const displayText = transcript || interimTranscript;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Visual Live Transcript Bubble */}
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 md:p-5 shadow-lg relative min-h-[90px] flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-yellow-400" aria-hidden="true" />
            <span>Voice Transcript</span>
          </span>
          {displayText && (
            <button
              onClick={onClear}
              aria-label="Clear transcript"
              className="accessible-target text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="text-lg md:text-xl font-medium text-white break-words">
          {transcript ? (
            <span className="text-yellow-400 font-bold">"{transcript}"</span>
          ) : interimTranscript ? (
            <span className="text-zinc-400 italic">"{interimTranscript}..."</span>
          ) : (
            <span className="text-zinc-500 italic text-base">
              Spoken words will appear here in real-time...
            </span>
          )}
        </div>
      </div>

      {/* Accessible Text Input Fallback */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            aria-expanded={showManualInput}
            className="accessible-target text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          >
            <Keyboard className="w-4 h-4" aria-hidden="true" />
            <span>{showManualInput ? 'Hide Accessible Text Input' : 'Type Command Manually (Accessible Fallback)'}</span>
          </button>
        </div>

        {showManualInput && (
          <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
            <label htmlFor="accessible-command-input" className="sr-only">
              Type payment voice command
            </label>
            <input
              id="accessible-command-input"
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="e.g. Pay 500 rupees to Ravi"
              disabled={disabled}
              className="accessible-target flex-1 bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-4 py-2 border-2 border-zinc-700 focus:border-yellow-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={disabled || !manualText.trim()}
              aria-label="Send typed command"
              className="accessible-target px-5 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-xl flex items-center gap-2"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
