# ── Stage 1: Build React/Vite frontend ──────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies from frontend/
COPY frontend/package*.json ./
RUN npm ci

# Copy entire frontend source
COPY frontend/ .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
