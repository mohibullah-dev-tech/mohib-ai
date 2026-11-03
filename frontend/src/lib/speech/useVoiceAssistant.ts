"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SpeechRecognitionService,
  SpeechLang,
  SpeechRecognitionResultPayload,
} from "./speechRecognition";
import {
  SpeechSynthesisService,
  VoiceOptionId,
} from "./speechSynthesis";

export type AssistantVoiceState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export function useVoiceAssistant() {
  const [isSupportedSTT, setIsSupportedSTT] = useState<boolean>(true);
  const [isSupportedTTS, setIsSupportedTTS] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<AssistantVoiceState>("idle");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceOptionId>("voice-1");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [speechLang, setSpeechLang] = useState<SpeechLang>("auto");
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [hasBanglaVoice, setHasBanglaVoice] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<string>("prompt");

  const sttServiceRef = useRef<SpeechRecognitionService | null>(null);
  const ttsServiceRef = useRef<SpeechSynthesisService | null>(null);

  // Initialize services on client
  useEffect(() => {
    sttServiceRef.current = new SpeechRecognitionService();
    ttsServiceRef.current = new SpeechSynthesisService();

    setIsSupportedSTT(SpeechRecognitionService.isSupported());
    setIsSupportedTTS(SpeechSynthesisService.isSupported());

    if (ttsServiceRef.current) {
      setHasBanglaVoice(ttsServiceRef.current.hasBanglaVoice());
      ttsServiceRef.current.onVoicesLoaded(() => {
        if (ttsServiceRef.current) {
          setHasBanglaVoice(ttsServiceRef.current.hasBanglaVoice());
        }
      });
    }

    // Check mic permission if supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus) => {
          setMicPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state);
          };
        })
        .catch(() => {
          setMicPermission("unknown");
        });
    }

    return () => {
      sttServiceRef.current?.abortListening();
      ttsServiceRef.current?.stop();
    };
  }, []);

  // Update STT language when changed
  useEffect(() => {
    sttServiceRef.current?.setLanguage(speechLang);
  }, [speechLang]);

  // Start listening
  const startListening = useCallback(
    (onFinalTranscript?: (text: string) => void) => {
      if (!sttServiceRef.current) return;

      // Stop speech if speaking when user starts talking
      if (ttsServiceRef.current?.getIsSpeaking()) {
        ttsServiceRef.current.stop();
        setIsSpeaking(false);
      }

      setVoiceError(null);
      setLiveTranscript("");
      setVoiceState("listening");
      setIsListening(true);

      sttServiceRef.current.startListening(
        (result: SpeechRecognitionResultPayload) => {
          setLiveTranscript(result.transcript);
          if (result.isFinal && onFinalTranscript) {
            onFinalTranscript(result.transcript);
            setLiveTranscript("");
          }
        },
        (error: string) => {
          setVoiceError(error);
          setVoiceState("error");
          setIsListening(false);
        },
        () => {
          setIsListening(false);
          setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
        },
        false
      );
    },
    []
  );

  // Stop listening
  const stopListening = useCallback(() => {
    sttServiceRef.current?.stopListening();
    setIsListening(false);
    setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(
    (onFinalTranscript?: (text: string) => void) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(onFinalTranscript);
      }
    },
    [isListening, startListening, stopListening]
  );

  // Toggle experimental wake word
  const toggleWakeWord = useCallback(
    (onWakeWordDetected: () => void) => {
      if (!sttServiceRef.current) return;

      if (isWakeWordActive) {
        sttServiceRef.current.stopListening();
        setIsWakeWordActive(false);
        setIsListening(false);
        setVoiceState("idle");
      } else {
        setVoiceError(null);
        setIsWakeWordActive(true);
        setIsListening(true);
        setVoiceState("listening");

        sttServiceRef.current.startListening(
          () => {},
          (err) => {
            setVoiceError(err);
            setIsWakeWordActive(false);
            setIsListening(false);
            setVoiceState("error");
          },
          () => {},
          true, // wakeWordMode
          () => {
            // Wake word detected!
            onWakeWordDetected();
          }
        );
      }
    },
    [isWakeWordActive]
  );

  // Speak AI response
  const speak = useCallback(
    (text: string) => {
      if (!ttsServiceRef.current || !autoSpeak) return;

      setVoiceState("speaking");
      setIsSpeaking(true);

      ttsServiceRef.current.speak(
        text,
        selectedVoice,
        speechSpeed,
        () => {
          setIsSpeaking(true);
          setVoiceState("speaking");
        },
        () => {
          setIsSpeaking(false);
          setVoiceState("idle");
        },
        (err) => {
          setVoiceError(err);
          setIsSpeaking(false);
          setVoiceState("idle");
        }
      );
    },
    [selectedVoice, speechSpeed, autoSpeak]
  );

  // Force speak regardless of autoSpeak setting (for Replay button)
  const forceSpeak = useCallback(
    (text: string) => {
      if (!ttsServiceRef.current) return;

      setVoiceState("speaking");
      setIsSpeaking(true);

      ttsServiceRef.current.speak(
        text,
        selectedVoice,
        speechSpeed,
        () => {
          setIsSpeaking(true);
          setVoiceState("speaking");
        },
        () => {
          setIsSpeaking(false);
          setVoiceState("idle");
        },
        (err) => {
          setVoiceError(err);
          setIsSpeaking(false);
          setVoiceState("idle");
        }
      );
    },
    [selectedVoice, speechSpeed]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    ttsServiceRef.current?.stop();
    setIsSpeaking(false);
    setVoiceState((prev) => (prev === "speaking" ? "idle" : prev));
  }, []);

  return {
    isSupportedSTT,
    isSupportedTTS,
    isListening,
    isSpeaking,
    isWakeWordActive,
    voiceState,
    setVoiceState,
    liveTranscript,
    voiceError,
    setVoiceError,
    selectedVoice,
    setSelectedVoice,
    speechSpeed,
    setSpeechSpeed,
    speechLang,
    setSpeechLang,
    autoSpeak,
    setAutoSpeak,
    hasBanglaVoice,
    micPermission,
    startListening,
    stopListening,
    toggleListening,
    toggleWakeWord,
    speak,
    forceSpeak,
    stopSpeaking,
  };
}
