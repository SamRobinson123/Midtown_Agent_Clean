# syntax=docker/dockerfile:1

########################
# Stage 1 — Build UI
########################
FROM node:20-alpine AS ui
WORKDIR /app/ui

# Install deps (uses package-lock.json if present)
COPY ui/package*.json ./
RUN npm ci --silent

# Build
COPY ui/ ./
RUN npm run build

########################
# Stage 2 — Python app
########################
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Native libs (libgomp1 needed by scikit-learn wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Python deps (root requirements.txt) ----
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Project code ----
COPY backend/ ./backend/
COPY bot/     ./bot/

# UI build output from Stage 1
COPY --from=ui /app/ui/dist ./ui/dist

# Default port Render uses
ENV PORT=10000
EXPOSE 10000

# Start server (Render will respect $PORT)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
