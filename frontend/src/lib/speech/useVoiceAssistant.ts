"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SpeechRecognitionService,
  SupportedSpeechLang,
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
  const [liveHearing, setLiveHearing] = useState<string>("");
  const [finalTranscript, setFinalTranscript] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceOptionId>("voice-1");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [speechLang, setSpeechLangState] = useState<SupportedSpeechLang>("bn-BD");
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [hasBanglaVoice, setHasBanglaVoice] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<string>("prompt");

  const sttServiceRef = useRef<SpeechRecognitionService | null>(null);
  const ttsServiceRef = useRef<SpeechSynthesisService | null>(null);
  const isSpeakingLock = useRef<boolean>(false);

  // Initialize services and saved language on client
  useEffect(() => {
    sttServiceRef.current = new SpeechRecognitionService();
    ttsServiceRef.current = new SpeechSynthesisService();

    setIsSupportedSTT(SpeechRecognitionService.isSupported());
    setIsSupportedTTS(SpeechSynthesisService.isSupported());

    // Restore saved language preference from localStorage (default: bn-BD)
    try {
      const savedLang = localStorage.getItem("friday_speech_lang") as SupportedSpeechLang;
      if (savedLang === "bn-BD" || savedLang === "en-US") {
        setSpeechLangState(savedLang);
        sttServiceRef.current?.setLanguage(savedLang);
      } else {
        sttServiceRef.current?.setLanguage("bn-BD");
      }
    } catch {
      sttServiceRef.current?.setLanguage("bn-BD");
    }

    if (ttsServiceRef.current) {
      setHasBanglaVoice(ttsServiceRef.current.hasBanglaVoice());
      ttsServiceRef.current.onVoicesLoaded(() => {
        if (ttsServiceRef.current) {
          setHasBanglaVoice(ttsServiceRef.current.hasBanglaVoice());
        }
      });
    }

    // Check mic permission status
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
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

  // Set language with persistence
  const setSpeechLang = useCallback((lang: SupportedSpeechLang) => {
    setSpeechLangState(lang);
    sttServiceRef.current?.setLanguage(lang);
    try {
      localStorage.setItem("friday_speech_lang", lang);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    isSpeakingLock.current = false;
    ttsServiceRef.current?.stop();
    setIsSpeaking(false);
    setVoiceState((prev) => (prev === "speaking" ? "idle" : prev));
  }, []);

  // Start listening
  const startListening = useCallback(
    (onFinalResult?: (text: string) => void) => {
      if (!sttServiceRef.current) return;

      // Stop speech immediately when listening begins
      stopSpeaking();

      setVoiceError(null);
      setLiveHearing("");
      setVoiceState("listening");
      setIsListening(true);

      sttServiceRef.current.startListening(
        (interimText: string) => {
          setLiveHearing(interimText);
        },
        (finalText: string) => {
          setFinalTranscript(finalText);
          setLiveHearing("");
          if (onFinalResult) {
            onFinalResult(finalText);
          }
        },
        (error: string) => {
          setVoiceError(error);
          setVoiceState("error");
          setIsListening(false);
          setLiveHearing("");
        },
        () => {
          setIsListening(false);
          setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
        },
        false
      );
    },
    [stopSpeaking]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    sttServiceRef.current?.stopListening();
    setIsListening(false);
    setLiveHearing("");
    setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
  }, []);

  // Toggle listening
  const toggleListening = useCallback(
    (onFinalResult?: (text: string) => void) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(onFinalResult);
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
            onWakeWordDetected();
          }
        );
      }
    },
    [isWakeWordActive]
  );

  // Speak AI response with single-execution guard
  const speak = useCallback(
    (text: string) => {
      if (!ttsServiceRef.current || !autoSpeak) return;

      // Prevent concurrent duplicate speech triggers
      ttsServiceRef.current.stop();
      isSpeakingLock.current = true;

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
          isSpeakingLock.current = false;
          setIsSpeaking(false);
          setVoiceState("idle");
        },
        (err) => {
          isSpeakingLock.current = false;
          setVoiceError(err);
          setIsSpeaking(false);
          setVoiceState("idle");
        }
      );
    },
    [selectedVoice, speechSpeed, autoSpeak]
  );

  // Force speak (for Replay button)
  const forceSpeak = useCallback(
    (text: string) => {
      if (!ttsServiceRef.current) return;

      ttsServiceRef.current.stop();
      isSpeakingLock.current = true;

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
          isSpeakingLock.current = false;
          setIsSpeaking(false);
          setVoiceState("idle");
        },
        (err) => {
          isSpeakingLock.current = false;
          setVoiceError(err);
          setIsSpeaking(false);
          setVoiceState("idle");
        }
      );
    },
    [selectedVoice, speechSpeed]
  );

  return {
    isSupportedSTT,
    isSupportedTTS,
    isListening,
    isSpeaking,
    isWakeWordActive,
    voiceState,
    setVoiceState,
    liveHearing,
    finalTranscript,
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
