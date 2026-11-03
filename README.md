# Mohib AI — Friday

**Mohib AI** is a lightweight, zero-cost-first personal AI desktop assistant named **Friday**. Designed with privacy, security, and bilingual support (Bangla and English) from day one, it runs smoothly on Windows 11 with 8 GB RAM.

---

## 🌟 Key Features

- **Zero-Cost-First Architecture**: Uses browser-native Web Speech STT/TTS and lightweight cloud/local interfaces without heavy hardware demands.
- **Bilingual Core**: Built-in support for Bangla (`bn-BD`) and English (`en-US`).
- **Security & Safety Guardrails**: Binds locally to `127.0.0.1`, keeps API keys backend-only, and enforces explicit user permission before executing terminal commands or file changes.
- **Push-to-Talk & Wake-Word Fallback**: Controlled microphone activation with transparent visual feedback.
- **Fast & Modern Stack**: Next.js (App Router, Tailwind CSS, TypeScript) + Python 3.12+ (FastAPI, Uvicorn, Pydantic).

---

## 📁 Project Structure

```text
mohib-ai/
├── frontend/             # Next.js frontend application
│   ├── src/
│   │   ├── app/          # App router pages & health dashboard
│   │   ├── components/   # UI components
│   │   └── lib/          # Backend API client
│   └── package.json
├── backend/              # FastAPI backend application
│   ├── app/
│   │   ├── api/          # Health, info, and assistant routes
│   │   ├── core/         # Settings and security configs
│   │   ├── models/       # Pydantic data models
│   │   └── main.py       # FastAPI application entrypoint
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt  # Python packages
│   └── venv/             # Python virtual environment
├── docs/                 # Architecture & milestone documentation
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
└── README.md             # This guide
```

---

## 🚀 Getting Started on Windows 11

### Prerequisites
- **Python**: 3.12 or 3.13 installed (`python --version`)
- **Node.js**: v18+ or v20+ installed (`node -v`, `npm -v`)
- **Git**: Installed (`git --version`)

---

### Step 1: Clone & Configure Environment
```powershell
# Copy the environment template
Copy-Item .env.example .env
```

---

### Step 2: Backend Setup
```powershell
# 1. Navigate to the backend directory or run from root:
# If virtual environment is not already created:
python -m venv backend/venv

# 2. Activate virtual environment (PowerShell):
.\backend\venv\Scripts\Activate.ps1

# 3. Install dependencies:
pip install -r backend/requirements.txt

# 4. Run backend tests:
$env:PYTHONPATH="backend"
pytest backend/tests/ -v

# 5. Start the backend server:
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
The backend API is now accessible at:
- **API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Interactive OpenAPI Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 3: Frontend Setup
In a new PowerShell terminal:
```powershell
# 1. Navigate to frontend:
cd frontend

# 2. Install dependencies (if not already done):
npm install

# 3. Start Next.js development server:
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000) to view the Friday dashboard and verify the backend connection.

---

## 🧪 Testing

### Backend Tests
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe .\backend\tests\ -v
```

### Frontend Build Test
```powershell
cd frontend
npm run build
```

---

## 🔒 Security Principles
- The backend listens on `127.0.0.1` by default and is not exposed to the public network.
- Environment variables (`.env`) are strictly ignored by Git.
- Never execute AI-suggested commands without reviewing and approving them.

