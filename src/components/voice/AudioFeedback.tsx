import React from 'react';
import { Volume2, Play } from 'lucide-react';
import { accessibilityService } from '../../services/accessibilityService';

export const AudioFeedback: React.FC = () => {
  return (
    <aside
      aria-label="Sound Feedback & Earcon Diagnostics"
      className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-yellow-400" aria-hidden="true" />
        <span>Audio Earcons (Chimes Active)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => accessibilityService.playListenStart()}
          aria-label="Test start chime"
          className="accessible-target px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center gap-1 border border-zinc-700"
        >
          <Play className="w-3 h-3" aria-hidden="true" />
          <span>Start</span>
        </button>
        <button
          type="button"
          onClick={() => accessibilityService.playSuccess()}
          aria-label="Test success chime"
          className="accessible-target px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-green-400 flex items-center gap-1 border border-zinc-700"
        >
          <Play className="w-3 h-3" aria-hidden="true" />
          <span>Success</span>
        </button>
      </div>
    </aside>
  );
};
