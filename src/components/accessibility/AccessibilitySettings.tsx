import React, { useState } from 'react';
import { Settings, Volume2, Type, Contrast, Eye, Languages, X } from 'lucide-react';
import { accessibilityService } from '../../services/accessibilityService';
import { speechSynthesisService } from '../../services/speechSynthesis';
import type { AccessibilityPreferences } from '../../types/voice';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(() =>
    accessibilityService.getPreferences()
  );

  if (!isOpen) return null;

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    const updated = accessibilityService.savePreferences({ [key]: value });
    setPrefs(updated);
    if (key === 'speechRate') {
      speechSynthesisService.setRate(value as number);
    }
  };

  const testSpeech = () => {
    speechSynthesisService.speak(
      `This is a test of the speech rate set to ${prefs.speechRate} times normal speed.`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-zinc-900 border-2 border-yellow-400 rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            <h2 id="settings-dialog-title" className="text-xl font-bold tracking-wide">
              Accessibility Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Accessibility Settings"
            className="accessible-target p-2 text-zinc-400 hover:text-white rounded-lg focus:ring-2 focus:ring-yellow-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* High Contrast Mode */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/80 rounded-xl border border-zinc-700">
            <div className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              <div>
                <span className="block font-semibold">High Contrast Mode</span>
                <span className="text-sm text-zinc-400">Pure black and yellow WCAG AAA theme</span>
              </div>
            </div>
            <button
              onClick={() => updatePreference('highContrast', !prefs.highContrast)}
              role="switch"
              aria-checked={prefs.highContrast}
              aria-label="Toggle High Contrast Mode"
              className={`accessible-target px-4 py-2 rounded-lg font-bold transition-colors ${
                prefs.highContrast
                  ? 'bg-yellow-400 text-black'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {prefs.highContrast ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Speech Rate Slider */}
          <div className="p-4 bg-zinc-800/80 rounded-xl border border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                <div>
                  <span className="block font-semibold">Speech Rate (TTS)</span>
                  <span className="text-sm text-zinc-400">Current: {prefs.speechRate}x</span>
                </div>
              </div>
              <button
                onClick={testSpeech}
                aria-label="Test current speech synthesis speed"
                className="accessible-target px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold rounded-md border border-zinc-600"
              >
                Test Voice
              </button>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={prefs.speechRate}
              aria-label="Speech rate slider"
              onChange={(e) => updatePreference('speechRate', parseFloat(e.target.value))}
              className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Fast)</span>
            </div>
          </div>

          {/* Text Size */}
          <div className="p-4 bg-zinc-800/80 rounded-xl border border-zinc-700 space-y-3">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              <span className="font-semibold">Text Size Scaling</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'large', 'extra-large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updatePreference('fontSize', size)}
                  aria-pressed={prefs.fontSize === size}
                  className={`accessible-target py-2 px-3 text-sm font-semibold rounded-lg capitalize border ${
                    prefs.fontSize === size
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-zinc-700 text-zinc-300 border-zinc-600 hover:bg-zinc-600'
                  }`}
                >
                  {size.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/80 rounded-xl border border-zinc-700">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              <div>
                <span className="block font-semibold">Reduce Motion</span>
                <span className="text-sm text-zinc-400">Disable pulsing and screen animations</span>
              </div>
            </div>
            <button
              onClick={() => updatePreference('reduceMotion', !prefs.reduceMotion)}
              role="switch"
              aria-checked={prefs.reduceMotion}
              aria-label="Toggle Reduced Motion"
              className={`accessible-target px-4 py-2 rounded-lg font-bold ${
                prefs.reduceMotion
                  ? 'bg-yellow-400 text-black'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {prefs.reduceMotion ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Audio Chime Earcons Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/80 rounded-xl border border-zinc-700">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              <div>
                <span className="block font-semibold">Sound Chimes (Earcons)</span>
                <span className="text-sm text-zinc-400">Audio pings on start, stop & success</span>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !prefs.voiceFeedbackEnabled;
                updatePreference('voiceFeedbackEnabled', next);
                if (next) accessibilityService.playSuccess();
              }}
              role="switch"
              aria-checked={prefs.voiceFeedbackEnabled}
              aria-label="Toggle Sound Chimes"
              className={`accessible-target px-4 py-2 rounded-lg font-bold ${
                prefs.voiceFeedbackEnabled
                  ? 'bg-yellow-400 text-black'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {prefs.voiceFeedbackEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Language Selection */}
          <div className="p-4 bg-zinc-800/80 rounded-xl border border-zinc-700 space-y-3">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              <span className="font-semibold">Voice Language (Ready for multi-lingual)</span>
            </div>
            <select
              value={prefs.language}
              onChange={(e) => updatePreference('language', e.target.value as AccessibilityPreferences['language'])}
              aria-label="Select voice language"
              className="accessible-target w-full bg-zinc-700 text-white rounded-lg px-3 py-2 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="en-IN">English (India) - en-IN</option>
              <option value="en-US">English (US) - en-US</option>
              <option value="hi-IN">Hindi (India) - hi-IN (Architecture Ready)</option>
              <option value="kn-IN">Kannada (India) - kn-IN (Architecture Ready)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="accessible-target px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl shadow-lg focus:ring-2 focus:ring-yellow-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
