# Mohib AI (Friday) — System Architecture

## 1. Overview
Mohib AI is an intelligent personal desktop assistant named **Friday**, engineered specifically with a **zero-cost-first**, **hybrid local + cloud**, and **security-first** architecture.

```
+-------------------------------------------------------------------+
|                        Mohib AI (Friday)                          |
+-------------------------------------------------------------------+
|                                                                   |
|   +--------------------------+     +--------------------------+   |
|   |   Frontend (Next.js)     |     |   Backend (FastAPI)      |   |
|   |                          |     |                          |   |
|   |  - Responsive Dashboard  |<--->|  - Health & Diagnostics  |   |
|   |  - Web Speech STT/TTS    | HTTP|  - Provider-agnostic AI  |   |
|   |  - Push-to-Talk Fallback |/WS  |  - Permission Guard      |   |
|   |  - Bangla & English UI   |     |  - Tool Execution Engine |   |
|   +--------------------------+     +--------------------------+   |
|                                                                   |
+-------------------------------------------------------------------+
```

## 2. Core Architectural Principles

### 2.1 Zero-Cost-First & Laptop-Friendly (8 GB RAM)
- No requirement for heavy local LLMs (such as 7B-14B models) that would overwhelm 8 GB RAM.
- Utilizes browser-native Web Speech API for zero-cost speech-to-text (STT) and text-to-speech (TTS) without demanding expensive local neural models or paid cloud credits.
- Free-tier cloud AI APIs (such as Gemini API free tiers) supported alongside local fallback options.

### 2.2 Security & Permission Architecture
- **Strict User Confirmation**: Terminal commands, file modifications, installations, and deletions can never run automatically. Explicit user approval is enforced.
- **Local Host Binding**: Backend binds strictly to `127.0.0.1` by default to prevent external local-network exposure.
- **Frontend Isolation**: Secrets and API keys are stored exclusively on the backend (`.env`), never exposed to frontend code.
- **No Invisible Surveillance**: Microphone captures require explicit browser permission and interactive Push-to-Talk activation with clear visual indicators.

### 2.3 Bilingual Capability (Bangla & English)
- Support for auto-detection and manual switching between Bangla (`bn-BD`) and English (`en-US`).
- Dual voice switching built into the speech synthesis layer.

## 3. Directory Layout
```
mohib-ai/
├── frontend/             # Next.js 15+ App Router, Tailwind CSS, TypeScript
│   ├── src/
│   │   ├── app/          # App router pages and layouts
│   │   ├── components/   # UI components
│   │   └── lib/          # API clients & speech utilities
│   ├── package.json
│   └── next.config.ts
├── backend/              # Python 3.12+ FastAPI backend
│   ├── app/
│   │   ├── api/          # Endpoints (health, chat, tools)
│   │   ├── core/         # Config, security, logging
│   │   ├── models/       # Pydantic data contracts
│   │   ├── services/     # Business logic & AI abstractions
│   │   └── main.py       # FastAPI application entrypoint
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt  # Python dependencies
│   └── venv/             # Local virtual environment (ignored in git)
├── docs/                 # Documentation & architectural guides
├── .env.example          # Environment configuration template
├── .gitignore            # Git exclusion definitions
└── README.md             # Project overview & Windows run guide
```

