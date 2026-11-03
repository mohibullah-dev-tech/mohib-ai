/**
 * Browser-native Web Speech Synthesis Service.
 * Provides text-to-speech with bilingual support, dual voice switching, and speed controls.
 */

export type VoiceOptionId = "voice-1" | "voice-2";

export interface VoiceOption {
  id: VoiceOptionId;
  name: string;
  description: string;
  pitch: number;
  rateMultiplier: number;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "voice-1",
    name: "Friday Classic",
    description: "Crisp, alert, and analytical voice",
    pitch: 1.05,
    rateMultiplier: 1.0,
  },
  {
    id: "voice-2",
    name: "Friday Warm",
    description: "Soft, calm, and conversational tone",
    pitch: 0.92,
    rateMultiplier: 0.95,
  },
];

export class SpeechSynthesisService {
  private isSpeaking: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onVoicesChangedCallbacks: Array<() => void> = [];

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
        this.onVoicesChangedCallbacks.forEach((cb) => cb());
      };
    }
  }

  public static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private loadVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  public hasBanglaVoice(): boolean {
    const list = this.getAvailableVoices();
    return list.some(
      (v) =>
        v.lang.toLowerCase().startsWith("bn") ||
        v.name.toLowerCase().includes("bangla") ||
        v.name.toLowerCase().includes("bengali")
    );
  }

  public onVoicesLoaded(callback: () => void) {
    this.onVoicesChangedCallbacks.push(callback);
  }

  /**
   * Cleans markdown characters (like *, #, `, []) so TTS reads natural spoken text.
   */
  public cleanMarkdownForSpeech(text: string): string {
    return text
      .replace(/\[Friday Demo Brain\]/gi, "")
      .replace(/\[.*?\]\(.*?\)/g, "$1") // clean links
      .replace(/[`*_~#]/g, "") // clean markdown formatting
      .replace(/```[\s\S]*?```/g, "Code block omitted.") // summarize code blocks
      .replace(/>\s*/g, "") // blockquotes
      .replace(/[-*+]\s+/g, "") // list bullets
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Speak response with voice options and speed.
   */
  public speak(
    text: string,
    voiceOptionId: VoiceOptionId = "voice-1",
    speed: number = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ) {
    if (!SpeechSynthesisService.isSupported()) {
      if (onError) onError("Text-to-Speech is not supported in this browser.");
      return;
    }

    this.stop(); // Stop any active speech

    const cleanText = this.cleanMarkdownForSpeech(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Detect language: Bangla or English
    const isBangla = /[\u0980-\u09FF]/.test(cleanText);
    const available = this.getAvailableVoices();

    const option =
      VOICE_OPTIONS.find((v) => v.id === voiceOptionId) || VOICE_OPTIONS[0];

    utterance.pitch = option.pitch;
    utterance.rate = speed * option.rateMultiplier;

    if (isBangla) {
      // Find Bengali voice if installed in OS
      const bnVoice = available.find(
        (v) =>
          v.lang.toLowerCase().startsWith("bn") ||
          v.name.toLowerCase().includes("bangla") ||
          v.name.toLowerCase().includes("bengali")
      );
      if (bnVoice) {
        utterance.voice = bnVoice;
        utterance.lang = bnVoice.lang;
      } else {
        // Fallback default
        utterance.lang = "en-US";
      }
    } else {
      // Find suitable English voice based on Voice 1 or Voice 2 preference
      const enVoices = available.filter((v) =>
        v.lang.toLowerCase().startsWith("en")
      );
      if (enVoices.length > 0) {
        if (voiceOptionId === "voice-2" && enVoices.length > 1) {
          utterance.voice = enVoices[1];
        } else {
          utterance.voice = enVoices[0];
        }
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (e.error !== "canceled" && onError) {
        onError(`Speech synthesis error: ${e.error}`);
      }
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

