# AgriSahayak

AgriSahayak is a voice-first agricultural marketplace demo for the Smart India Hackathon. Farmers can ask questions in their language, upload a crop image, receive a transparent quality assessment, and see whether it is routed to food buyers or the waste marketplace.

## Project layout

- `src/`: React + Vite frontend
- `backend/app/`: FastAPI backend
- `backend/tests/`: backend tests
- `data/uploads/`: local crop image uploads
- `models/`: local YOLO and speech model files
- `docs/`: architecture notes
- `frontend/`: reserved frontend module boundary
- `Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`: container deployment

## Setup

### Frontend

```powershell
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173`.

To open it on a phone connected to the same Wi-Fi network, start both services on the LAN interface:

```powershell
npm run dev -- --host 0.0.0.0
& .\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0
```

Find your computer's IPv4 address with `ipconfig`, then open `http://YOUR_IPV4_ADDRESS:5173` on the phone. The app automatically sends API requests to the same computer on port `8000`. Windows Firewall may ask you to allow Node and Python on private networks.

### Backend

The backend virtual environment is `backend/.venv`.

```powershell
& .\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python -m uvicorn app.main:app --app-dir backend --reload
```

The API runs at `http://localhost:8000`; interactive docs are at `/docs`.

Available API endpoints:

- `GET /api/health`: service status
- `POST /api/voice`: Ollama-powered assistant response with local fallback
- `POST /api/grade`: image validation and baseline crop assessment
- `POST /api/route`: food or waste marketplace destination

The implemented flow follows the PPT end to end: farmer voice/app input -> assistant guidance -> crop image assessment -> quality grade -> smart routing -> food buyer or waste/resource buyer -> measurable value recovery.

Run backend tests from the repository root:

```powershell
& .\backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

### Lightweight AI options

Ollama is optional. The recommended low-memory option is a hosted API such as Groq. It does not download a model to your laptop and has a generous free developer tier. Create a Groq API key, then put it in `backend/.env`:

```env
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_API_KEY=your-groq-key
AI_MODEL=llama-3.1-8b-instant
```

The same adapter works with OpenAI-compatible providers such as OpenRouter, Together, or a company gateway by changing `AI_API_URL` and `AI_MODEL`. Keep the key only in `backend/.env`; never put it in React code or commit it.

Ollama remains available as a local alternative. If you choose it, install Ollama, pull a model, and leave it running:

```powershell
ollama pull llama3.2:3b
ollama serve
```

The default configuration is in `backend/.env.example`. The provider order is hosted AI (when `AI_API_KEY` exists), then Ollama (when it is running), then a deterministic local fallback. This means the app works even with no AI service installed.

Optional computer-vision dependencies:

```powershell
& .\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-ml.txt
```

The current crop grader intentionally has a deterministic Pillow baseline. Add YOLO weights under `models/` and connect them in `backend/app/services/grading.py` for production crop-specific grading. Whisper and Piper can be added behind the same voice endpoint when speech model files are available.

### Docker deployment

Copy `backend/.env.example` to `backend/.env`, then run the complete stack:

```powershell
docker compose up --build
```

This starts the React/Nginx frontend, FastAPI backend, and PostgreSQL service. The browser speech capture remains lightweight and runs in the farmer's browser; the backend AI provider can be Groq or another OpenAI-compatible hosted service.

## Verification

```powershell
npm run lint
npm run build
& .\backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```
