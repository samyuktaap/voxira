import { useState, useEffect, useCallback, useRef } from 'react';
import { speechRecognitionService } from '../services/speechRecognition';
import type { VoiceRecognitionError } from '../types/voice';
import { accessibilityService } from '../services/accessibilityService';

export function useVoiceRecognition(onFinalTranscript?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  useEffect(() => {
    setIsSupported(speechRecognitionService.isSupported());
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    accessibilityService.playListenStart();

    speechRecognitionService.start({
      onStart: () => {
        setIsListening(true);
      },
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript('');
          onFinalRef.current?.(text);
        } else {
          setInterimTranscript(text);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setError(err);
        accessibilityService.playError();
      },
      onEnd: () => {
        setIsListening(false);
        accessibilityService.playListenStop();
      },
    });
  }, []);

  const stopListening = useCallback(() => {
    speechRecognitionService.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
