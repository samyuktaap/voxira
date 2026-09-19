import React, { useEffect, useState, useRef } from 'react';
import {
  Shield,
  Settings,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { VoiceButton } from '../components/voice/VoiceButton';
import { VoiceStatus } from '../components/voice/VoiceStatus';
import { TranscriptDisplay } from '../components/voice/TranscriptDisplay';
import { VoiceCommandHelp } from '../components/voice/VoiceCommandHelp';
import { AudioFeedback } from '../components/voice/AudioFeedback';
import { AccessibilitySettings } from '../components/accessibility/AccessibilitySettings';
import { PaymentIntentSummary } from '../components/payment/PaymentIntentSummary';
import { PaymentConfirmation } from '../components/payment/PaymentConfirmation';
import { PaymentResult } from '../components/payment/PaymentResult';
import { FocusManager } from '../components/accessibility/FocusManager';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useVoiceCommand } from '../hooks/useVoiceCommand';

export const VoiceHome: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const hasGreetedRef = useRef(false);

  const {
    voiceState,
    statusMessage,
    errorMessage,
    transaction,
    finalResult,
    handleTranscript,
    triggerDeviceAuthentication,
    submitFinalPayment,
    cancelFlow,
    repeatDetails,
    resetFlow,
    speakAndAnnounce,
  } = useVoiceCommand();

  const {
    isListening,
    transcript,
    interimTranscript,
    error: micError,
    isSupported: isMicSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition((finalText) => {
    handleTranscript(finalText);
  });

  // Welcome speech greeting on initial mount (WCAG / Voice-first requirement)
  useEffect(() => {
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const greeting = 'Welcome to BlindPay. You can say pay, check payment status, or help.';
      speakAndAnnounce(greeting);
    }
  }, [speakAndAnnounce]);

  const toggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <FocusManager>
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-yellow-400 selection:text-black">
        {/* Accessible Header */}
        <header className="w-full border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black text-xl shadow-md">
                ₹
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-white">
                  BlindPay
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-mono font-bold border border-yellow-400/30">
                    Voice Fintech
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 font-medium">Accessible Voice-First Payment Interface</p>
              </div>
            </div>

            {/* Global Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHelpOpen(true)}
                aria-label="Open voice commands help"
                className="accessible-target p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-yellow-400 border border-zinc-700 focus:ring-2 focus:ring-yellow-400"
              >
                <HelpCircle className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Open accessibility settings"
                className="accessible-target p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 focus:ring-2 focus:ring-yellow-400"
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Interactive Stage */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col items-center justify-center space-y-6">
          {/* Security Banner */}
          <div className="w-full max-w-xl bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
              <span>Voice is an input layer. Authorization controlled by security engine.</span>
            </div>
          </div>

          {/* Dynamic State View */}
          {voiceState === 'SUCCESS' && finalResult ? (
            <PaymentResult
              result={finalResult}
              onReset={resetFlow}
              onRepeat={repeatDetails}
            />
          ) : voiceState === 'AUTHENTICATION_REQUIRED' && transaction ? (
            <PaymentConfirmation
              transaction={transaction}
              onConfirm={() => submitFinalPayment(transaction.transaction_id)}
              onCancel={cancelFlow}
              isAuthenticating={false}
            />
          ) : voiceState === 'CONFIRMATION_REQUIRED' && transaction ? (
            <PaymentConfirmation
              transaction={transaction}
              onConfirm={() => submitFinalPayment(transaction.transaction_id)}
              onCancel={cancelFlow}
              isAuthenticating={false}
            />
          ) : voiceState === 'REVIEWING' && transaction ? (
            <PaymentIntentSummary
              transaction={transaction}
              onConfirm={() => triggerDeviceAuthentication(transaction.transaction_id)}
              onCancel={cancelFlow}
              onRepeat={repeatDetails}
            />
          ) : (
            <>
              {/* Voice Interaction State Machine Indicator */}
              <VoiceStatus
                voiceState={isListening ? 'LISTENING' : voiceState}
                statusMessage={statusMessage}
                errorMessage={errorMessage || micError?.message}
                onRepeat={repeatDetails}
              />

              {/* Central Voice Button */}
              <VoiceButton
                isListening={isListening}
                voiceState={voiceState}
                onToggleListen={toggleListen}
                disabled={!isMicSupported && !micError}
              />

              {/* Transcript & Fallback Input */}
              <TranscriptDisplay
                transcript={transcript}
                interimTranscript={interimTranscript}
                onSubmitTextCommand={(cmd) => handleTranscript(cmd)}
                onClear={resetTranscript}
                disabled={voiceState === 'PROCESSING' || voiceState === 'WAITING_FOR_BACKEND'}
              />

              {/* Quick Prompt Suggestions */}
              <div className="w-full max-w-xl">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Try saying or tapping:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Pay 500 rupees to Ravi',
                    'Send 100 rupees to Priya',
                    'Pay 9999 rupees to Ravi (Mismatch Demo)',
                    'Repeat details',
                    'Help',
                  ].map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => handleTranscript(phrase)}
                      aria-label={`Execute voice command: ${phrase}`}
                      className="accessible-target px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-yellow-400/50 flex items-center gap-1.5 transition-colors"
                    >
                      <span>"{phrase}"</span>
                      <ArrowRight className="w-3 h-3 text-yellow-400" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Earcon Diagnostic Box */}
          <div className="w-full max-w-xl">
            <AudioFeedback />
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-zinc-800/80 bg-zinc-900/40 py-4 px-4 text-center text-xs text-zinc-500">
          <p>
            BlindPay Module 1 • WCAG 2.2 AAA Voice & Accessibility Architecture • Hackathon Sandbox
          </p>
        </footer>

        {/* Modals */}
        <VoiceCommandHelp
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          onSelectCommand={(cmd) => handleTranscript(cmd)}
        />

        <AccessibilitySettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </FocusManager>
  );
};
