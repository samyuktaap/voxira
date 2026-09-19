import { useState, useEffect, useCallback } from 'react';
import { speechSynthesisService } from '../services/speechSynthesis';
import type { SpeechSynthesisOptions } from '../types/voice';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(speechSynthesisService.isSupported());
  }, []);

  const speak = useCallback((text: string, options?: SpeechSynthesisOptions) => {
    setIsSpeaking(true);
    return speechSynthesisService.speak(text, {
      ...options,
      onEnd: () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      },
      onError: (err) => {
        setIsSpeaking(false);
        options?.onError?.(err);
      },
    });
  }, []);

  const stop = useCallback(() => {
    speechSynthesisService.stop();
    setIsSpeaking(false);
  }, []);

  const repeat = useCallback(() => {
    setIsSpeaking(true);
    return speechSynthesisService.repeatLast().finally(() => {
      setIsSpeaking(false);
    });
  }, []);

  const setRate = useCallback((rate: number) => {
    speechSynthesisService.setRate(rate);
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    repeat,
    setRate,
  };
}
