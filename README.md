# AgriSahayak — AI-Powered Voice-First Agricultural Marketplace

> **Smart India Hackathon 2026 · Team Avengers**

AgriSahayak is a voice-first, multilingual platform that guides Indian farmers through the complete post-harvest journey:  
**Voice Guidance → AI Crop Grading → Smart Marketplace Routing → Value Recovery**

Produce is never wasted — it is automatically routed to either the **Food Marketplace** (retailers, wholesalers, consumers) or the **Waste/Resource Marketplace** (composters, biogas plants, recyclers).

---

## Project Structure

```
winner/
├── frontend/              ← React + Vite (all UI code)
│   ├── index.html
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── package.json
│   ├── public/            ← static assets (favicon, icons)
│   └── src/
│       ├── main.jsx       ← React entry point
│       ├── App.jsx        ← full app with STT + TTS + grading + routing
│       ├── App.css        ← all styles
│       └── assets/
│           └── hero.png
├── backend/               ← FastAPI Python backend
│   ├── Dockerfile
│   ├── .env.example       ← copy to .env and fill in keys
│   ├── requirements.txt
│   ├── requirements-ml.txt
│   └── app/
│       ├── main.py        ← FastAPI app + CORS
│       ├── api/
│       │   └── routes.py  ← /api/voice, /api/grade, /api/route, /api/health
│       ├── core/
│       │   └── config.py  ← pydantic-settings config
│       └── services/
│           ├── assistant.py   ← AI voice assistant (Groq/Ollama/fallback)
│           ├── grading.py     ← colour + sharpness crop heuristic
│           └── marketplace.py ← food vs waste routing logic
├── data/
│   └── uploads/           ← crop image uploads (git-ignored except .gitkeep)
├── models/                ← placeholder for YOLO weights (add .pt files here)
├── docs/
│   └── architecture.md
├── Dockerfile             ← multi-stage: Node build → Nginx serve
├── docker-compose.yml     ← frontend + backend + PostgreSQL
├── .gitignore
├── .dockerignore
└── README.md
```

---

## Features

| Feature | How it works |
|---|---|
| 🎤 **Speech-to-Text (STT)** | Browser Web Speech API — no server needed. Supports Hindi, English, Marathi, Telugu |
| 🔊 **Text-to-Speech (TTS)** | Browser SpeechSynthesis API — reads AI replies aloud in the correct language. Mute toggle included |
| 🌱 **Crop Grading** | Heuristic image analysis (brightness, sharpness, colour channel ratios) using Pillow. Grades: A+, A (food), B+, B (waste) |
| 🛒 **Marketplace Routing** | A+/A → Food Marketplace · B+/B → Waste/Resource Marketplace |
| 🤖 **AI Voice Assistant** | Groq (cloud, free tier) → Ollama (local) → deterministic fallback |
| 🌐 **Multilingual** | Hindi (`hi-IN`), English (`en-IN`), Marathi (`mr-IN`), Telugu (`te-IN`) |

---

## Tech Stack

### What you need to install on your device

#### System requirements
| Tool | Version | Why |
|---|---|---|
| **Node.js** | ≥ 20 (LTS) | Run Vite dev server and build frontend |
| **Python** | ≥ 3.11 | Run FastAPI backend |
| **Git** | any | Clone the repo |
| **Chrome or Edge** | latest | Required for STT (Web Speech API) |

> **Note:** Firefox does not support the Web Speech API. Use Chrome or Edge for voice features.

#### Optional
| Tool | Why |
|---|---|
| **Ollama** | Local AI model — free, offline. Pull `llama3.2:3b` |
| **Docker + Docker Compose** | Run the full stack in containers |
| **PostgreSQL** | Production database (SQLite used by default in dev) |

---

## Quick Start

### 1. Clone
```powershell
git clone <repo-url>
cd winner
```

### 2. Backend setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env — at minimum add your AI_API_KEY (or leave blank for local fallback)
cd ..
```

Start the backend:
```powershell
& .\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```
Backend API: `http://localhost:8000` · Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup
```powershell
cd frontend
npm install
npm run dev
```
Open: **`http://localhost:5173`**

---

## AI Configuration

The assistant uses a **three-tier fallback** — you always get a response:

```
Groq (cloud, fast, free) → Ollama (local) → Static fallback
```

### Option A — Groq (recommended, free)
1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Add to `backend/.env`:
```env
AI_API_KEY=gsk_your_groq_key_here
AI_MODEL=llama-3.1-8b-instant
```

### Option B — Ollama (local, offline)
1. Download [Ollama](https://ollama.com)
2. Pull a model and start:
```powershell
ollama pull llama3.2:3b
ollama serve
```

### Option C — No config needed
The app works with a deterministic local fallback out of the box.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status check |
| `POST` | `/api/voice` | AI assistant — body: `{ message, language }` |
| `POST` | `/api/grade` | Crop grading — multipart image upload |
| `POST` | `/api/route` | Marketplace routing — body: `{ grade, confidence }` |

---

## Running on a Phone (same Wi-Fi)

Start both services on LAN:
```powershell
# Terminal 1 — Frontend
cd frontend
npm run dev -- --host 0.0.0.0

# Terminal 2 — Backend
& .\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0
```

Find your PC's IP with `ipconfig`, then open `http://YOUR_IP:5173` on the phone.  
Windows Firewall may ask to allow Node and Python — allow on private networks.

---

## Docker (full stack)

```powershell
Copy-Item backend\.env.example backend\.env
# Edit backend\.env — add AI_API_KEY if using Groq
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (Nginx) | `http://localhost:5173` |
| Backend (FastAPI) | `http://localhost:8000` |
| PostgreSQL | `localhost:5432` |

---

## What Was Built (vs PPT)

| PPT Feature | Status | Notes |
|---|---|---|
| AI Voice Assistant (STT) | ✅ | Browser Web Speech API, 4 languages |
| TTS — speaks reply aloud | ✅ | Browser SpeechSynthesis, mute toggle, language-aware |
| Crop image grading | ✅ | Colour + sharpness heuristic (Pillow). Grades A+/A/B+/B |
| Smart Marketplace Routing | ✅ | Food vs Waste/Resource with buyer types |
| End-to-end flow | ✅ | Voice → Grade → Route → Marketplace panel |
| Multilingual (4 languages) | ✅ | STT + TTS both switch language |
| Voice-first (no literacy needed) | ✅ | Mic button + spoken reply |
| Value Recovery routing | ✅ | B/B+ grades auto-route to biogas/composters |
| YOLO crop-specific grading | 🔜 | Add weights to `models/` and connect in `grading.py` |
| IoT sensor integration | 🔜 | Architecture placeholder in `docs/` |

---

## Verification

```powershell
# Frontend lint + build
cd frontend
npm run lint
npm run build

# Backend tests
& .\backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

---

## Crop Grading Logic

The heuristic in `backend/app/services/grading.py` checks:

1. **Size** — rejects images < 200 × 200 px
2. **Brightness** — rejects too dark (< 40) or over-exposed (> 220)
3. **Sharpness** — pixel variance < 180 → blurry, send to waste
4. **Green-channel ratio** — ≥ 0.38 → A+ (very fresh), ≥ 0.30 → A (food-grade)
5. **Red-channel dominance** — high red + low green → B (possible spoilage)

To add YOLO: install `ultralytics` from `requirements-ml.txt`, place `.pt` weights in `models/`, and replace the body of `assess_crop()` with YOLO inference.

---

© 2026 AgriSahayak · Team Avengers · Smart India Hackathon 2026
