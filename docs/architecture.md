# AgriSahayak Architecture

- `src/`: React/Vite farmer-facing frontend
- `backend/app/`: FastAPI API and domain services
- `data/uploads/`: local crop image uploads (ignored by Git)
- `models/`: local YOLO and speech model artifacts (ignored by Git)
- `tests/`: cross-layer and API tests
- `frontend/`: reserved frontend module boundary

Core flow: voice or app input -> assistant response -> crop image -> CV grading -> food/waste routing.
