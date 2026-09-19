import React from 'react';
import { HelpCircle, Volume2, X, Check } from 'lucide-react';
import { speechSynthesisService } from '../../services/speechSynthesis';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand?: (cmd: string) => void;
}

const SAMPLE_COMMANDS = [
  {
    phrase: 'Pay 500 rupees to Ravi',
    desc: 'Initiates a standard money transfer with amount and recipient.',
    category: 'Payment',
  },
  {
    phrase: 'Send 100 rupees to Priya',
    desc: 'Alternative syntax for transferring funds.',
    category: 'Payment',
  },
  {
    phrase: 'Repeat payment details',
    desc: 'Reads back the recipient, amount, and status aloud.',
    category: 'Information',
  },
  {
    phrase: 'Check my payment status',
    desc: 'Inquires about the status of the current transaction.',
    category: 'Information',
  },
  {
    phrase: 'Confirm payment',
    desc: 'Authorizes final transfer after device authentication.',
    category: 'Action',
  },
  {
    phrase: 'Cancel',
    desc: 'Aborts the current transaction immediately.',
    category: 'Control',
  },
  {
    phrase: 'Help',
    desc: 'Speaks helpful guidance on available commands.',
    category: 'Support',
  },
];

export const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
}) => {
  if (!isOpen) return null;

  const speakPhrase = (phrase: string) => {
    speechSynthesisService.speak(`Example command: ${phrase}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl bg-zinc-900 border-2 border-yellow-400 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            <h2 id="help-dialog-title" className="text-xl font-bold">
              Voice Commands Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Voice Help Dialog"
            className="accessible-target p-2 text-zinc-400 hover:text-white rounded-lg focus:ring-2 focus:ring-yellow-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-4 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-sm text-zinc-300">
            Speak naturally into the microphone. You can use any of the following commands:
          </p>

          <div className="space-y-2 mt-3">
            {SAMPLE_COMMANDS.map((cmd) => (
              <div
                key={cmd.phrase}
                className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-yellow-400 font-mono font-semibold">
                      {cmd.category}
                    </span>
                    <span className="font-bold text-white text-base">"{cmd.phrase}"</span>
                  </div>
                  <p className="text-xs text-zinc-400">{cmd.desc}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => speakPhrase(cmd.phrase)}
                    aria-label={`Listen to pronunciation for ${cmd.phrase}`}
                    className="accessible-target p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-yellow-400 border border-zinc-600"
                    title="Read phrase aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {onSelectCommand && (
                    <button
                      onClick={() => {
                        onSelectCommand(cmd.phrase);
                        onClose();
                      }}
                      aria-label={`Use command ${cmd.phrase}`}
                      className="accessible-target p-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg"
                      title="Use this command"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="accessible-target px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
