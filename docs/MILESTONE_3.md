# Milestone 3: Friday Voice Assistant Verification & Report

## 1. Objectives Completed
- [x] **Browser-Native Speech Recognition (STT):**
  - Web Speech API integration (`webkitSpeechRecognition` / `SpeechRecognition`).
  - Supports Bangla (`bn-BD`), English (`en-US`), and `Auto (BN/EN)` detection.
  - Push-to-talk & click-to-talk interactive microphone button.
  - Live interim transcript display with full user editing capability before submitting.
  - Graceful handling of microphone permission denial (`NotAllowedError`), no-speech timeouts, and unsupported browsers.
- [x] **Speech Synthesis (TTS) Engine:**
  - Browser-native `window.speechSynthesis` integration.
  - Dual selectable voices: **Voice 1 (Friday Classic)** and **Voice 2 (Friday Warm)**.
  - Dynamic speech speed control: 0.8x, 1.0x, 1.2x, 1.5x.
  - Language detection for AI responses: checks for Bengali Unicode (`[\u0980-\u09FF]`) and matches against installed OS voices.
  - Transparent disclosure: Does not falsely claim a voice is native Bangla unless the OS/browser actually provides one.
  - Message Replay button (`Speak`) and global floating **Stop Speaking** button.
- [x] **Experimental Wake Word Engine:**
  - Prototype wake-word detection for `"Friday"` / `"Hey Friday"` / `"ফ্রাইডে"`.
  - Transparent limitation disclosure: Not continuous military-grade always-on audio; browser speech APIs timeout naturally upon silence.
  - Push-to-talk provided as the primary zero-cost reliable fallback.
  - Strict privacy: No audio recordings are ever uploaded or sent to servers.
- [x] **Voice Assistant UI / UX:**
  - Animated central **Voice Orb** with distinct visual states: *Idle*, *Listening*, *Thinking*, *Speaking*, *Error*.
  - Full voice settings modal for voice personality, language, speed, and browser capability diagnostics.
  - Seamless integration into existing text chat without breaking any prior Milestone functionality.

## 2. Technical Capabilities & Browser Transparency
| Feature | Implementation | Limitation / Fallback |
| :--- | :--- | :--- |
| **Speech-to-Text** | Web Speech API | Supported on Chrome, Edge, and Chromium browsers. Graceful alert on unsupported engines. |
| **Bangla Speech Input** | `recognition.lang = 'bn-BD'` | Accurately parses Bengali speech when spoken clearly. |
| **Text-to-Speech** | `SpeechSynthesisUtterance` | Zero-cost and zero-latency using local browser synthesis. |
| **Bangla Output Voice** | OS/Browser installed voice | If no native Bengali voice is installed in the user's OS, falls back to default system voice without false claims. |
| **Wake Word** | Keyword stream matching | Experimental; browser silences after timeouts. Push-to-talk is the reliable guarantee. |
| **Privacy & Security** | Client-side only | Audio streams are processed strictly in-browser; zero audio data transmitted to backend. |

## 3. Test & Verification
- Pytest backend suite: 9/9 tests passing.
- Next.js Turbopack build: Passed with 0 TypeScript/ESLint errors.
- Chat API compatibility: Preserved 100%.
