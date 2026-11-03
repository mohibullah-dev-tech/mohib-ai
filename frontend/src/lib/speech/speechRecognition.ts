/**
 * Browser-native Web Speech API Recognition Service.
 * Provides accurate, explicit language speech-to-text with bilingual support (Bangla & English).
 */

export type SupportedSpeechLang = "bn-BD" | "en-US";

export interface SpeechRecognitionResultPayload {
  interimTranscript: string;
  finalTranscript: string;
  lang: SupportedSpeechLang;
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
  private selectedLang: SupportedSpeechLang = "bn-BD"; // Default to Bangla as primary requested

  // Callbacks
  private onInterimCallback?: (text: string) => void;
  private onFinalCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;
  private onWakeWordCallback?: () => void;

  // Session state to prevent duplicate emission
  private accumulatedFinalTranscript: string = "";
  private currentInterimTranscript: string = "";

  constructor() {
    if (typeof window !== "undefined") {
      const win = window as unknown as IWindow;
      const SpeechRecognitionAPI =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = false; // standard turn-based recognition
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

    this.recognition.onstart = () => {
      this.isListening = true;
      this.accumulatedFinalTranscript = "";
      this.currentInterimTranscript = "";
    };

    this.recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcriptText = item[0]?.transcript || "";

        if (item.isFinal) {
          this.accumulatedFinalTranscript += (this.accumulatedFinalTranscript ? " " : "") + transcriptText.trim();
        } else {
          interim += transcriptText;
        }
      }

      this.currentInterimTranscript = interim;

      // Experimental Wake Word detection
      const fullCurrentText = (this.accumulatedFinalTranscript + " " + interim).trim().toLowerCase();
      if (this.isWakeWordMode && fullCurrentText) {
        if (
          fullCurrentText.includes("friday") ||
          fullCurrentText.includes("hey friday") ||
          fullCurrentText.includes("ফ্রাইডে")
        ) {
          if (this.onWakeWordCallback) {
            this.onWakeWordCallback();
          }
          return;
        }
      }

      // Send live interim text to UI for real-time visualization
      if (this.onInterimCallback) {
        this.onInterimCallback(interim || this.accumulatedFinalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      let msg = "Microphone error occurred.";
      if (event.error === "not-allowed") {
        msg = "মাইক্রোফোন পারমিশন দেওয়া হয়নি। দয়া করে ব্রাউজারের সাইট সেটিংসে মাইক্রোফোন Allow করুন।";
      } else if (event.error === "no-speech") {
        msg = "কোনো কথা শোনা যায়নি। দয়া করে আবার স্পষ্ট করে বলুন।";
      } else if (event.error === "network") {
        msg = "নেটওয়ার্ক ত্রুটি। ব্রাউজারের স্পিচ সার্ভিস ইন্টারনেটে সংযোগ পেতে ব্যর্থ হয়েছে।";
      } else if (event.error === "audio-capture") {
        msg = "মাইক্রোফোন ডিভাইস পাওয়া যায়নি বা অন্য অ্যাপ ব্যবহার করছে।";
      } else if (event.error === "language-not-supported") {
        msg = `নির্বাচিত ভাষা (${this.selectedLang}) এই ব্রাউজারে সমর্থিত নয়। Google Chrome বা Microsoft Edge ব্যবহার করুন।`;
      }
      if (this.onErrorCallback) {
        this.onErrorCallback(msg);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;

      // Deliver final accumulated transcript once
      const finalResult = this.accumulatedFinalTranscript.trim() || this.currentInterimTranscript.trim();
      if (finalResult && this.onFinalCallback && !this.isWakeWordMode) {
        this.onFinalCallback(finalResult);
      }

      // Wake word auto-restart if enabled
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

  /**
   * Explicitly set the recognition language: bn-BD or en-US.
   * Never forces en-US when bn-BD is selected.
   */
  public setLanguage(lang: SupportedSpeechLang) {
    this.selectedLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getSelectedLanguage(): SupportedSpeechLang {
    return this.selectedLang;
  }

  public startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    wakeWordMode: boolean = false,
    onWakeWord?: () => void
  ) {
    if (!this.recognition) {
      onError(
        "Web Speech API এই ব্রাউজারে সমর্থিত নয়। বাংলা ভয়েস ইনপুটের জন্য Google Chrome বা Microsoft Edge ব্রাউজার ব্যবহার করুন।"
      );
      return;
    }

    this.onInterimCallback = onInterim;
    this.onFinalCallback = onFinal;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;
    this.isWakeWordMode = wakeWordMode;
    this.onWakeWordCallback = onWakeWord;

    // Apply strict chosen language directly to recognition instance
    this.recognition.lang = this.selectedLang;

    try {
      this.accumulatedFinalTranscript = "";
      this.currentInterimTranscript = "";
      this.recognition.start();
      this.isListening = true;
    } catch (e: any) {
      if (e.name !== "InvalidStateError") {
        onError(`স্পিচ রিকগনিশন শুরু করা যায়নি: ${e.message || e}`);
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
