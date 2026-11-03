/**
 * Browser-native Web Speech API Recognition Service.
 * Provides zero-cost speech-to-text with bilingual support (Bangla & English).
 */

export type SpeechLang = "auto" | "bn-BD" | "en-US";

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
  detectedLang?: string;
}

// Window declaration for cross-browser speech recognition support
export interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isWakeWordMode: boolean = false;
  private selectedLang: SpeechLang = "auto";
  private onResultCallback?: (result: SpeechRecognitionResultPayload) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;
  private onWakeWordCallback?: () => void;

  constructor() {
    // Check browser support
    if (typeof window !== "undefined") {
      const win = window as unknown as IWindow;
      const SpeechRecognitionAPI =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.setupListeners();
      }
    }
  }

  public static isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private setupListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;

      // Experimental Wake Word detection
      if (this.isWakeWordMode && activeText) {
        const lower = activeText.toLowerCase();
        if (
          lower.includes("friday") ||
          lower.includes("hey friday") ||
          activeText.includes("ফ্রাইডে")
        ) {
          if (this.onWakeWordCallback) {
            this.onWakeWordCallback();
          }
          return;
        }
      }

      if (this.onResultCallback && activeText) {
        this.onResultCallback({
          transcript: activeText,
          isFinal: Boolean(finalTranscript),
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      let msg = "Microphone error occurred.";
      if (event.error === "not-allowed") {
        msg = "Microphone permission was denied. Please allow microphone access in your browser.";
      } else if (event.error === "no-speech") {
        msg = "No speech was detected. Please try speaking again.";
      } else if (event.error === "network") {
        msg = "Network error during speech recognition. Ensure your connection is active.";
      } else if (event.error === "audio-capture") {
        msg = "No microphone was found or microphone is busy.";
      }
      if (this.onErrorCallback) {
        this.onErrorCallback(msg);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // If in wake-word mode and still enabled, restart recognition safely
      if (this.isWakeWordMode) {
        try {
          this.recognition.start();
          this.isListening = true;
          return;
        } catch {
          // ignore restart errors
        }
      }
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  public setLanguage(lang: SpeechLang) {
    this.selectedLang = lang;
    if (this.recognition) {
      if (lang === "bn-BD") {
        this.recognition.lang = "bn-BD";
      } else if (lang === "en-US") {
        this.recognition.lang = "en-US";
      } else {
        // Auto default to English, will adapt based on input
        this.recognition.lang = "en-US";
      }
    }
  }

  public startListening(
    onResult: (result: SpeechRecognitionResultPayload) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    wakeWordMode: boolean = false,
    onWakeWord?: () => void
  ) {
    if (!this.recognition) {
      onError("Speech Recognition is not supported by your current browser. Try Google Chrome or Microsoft Edge.");
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
    this.isWakeWordMode = wakeWordMode;
    this.onWakeWordCallback = onWakeWord;

    this.setLanguage(this.selectedLang);

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e: any) {
      if (e.name !== "InvalidStateError") {
        onError(`Could not start recognition: ${e.message || e}`);
      }
    }
  }

  public stopListening() {
    this.isWakeWordMode = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  public abortListening() {
    this.isWakeWordMode = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }
}
