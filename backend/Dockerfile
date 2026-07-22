FROM python:3.11-slim

WORKDIR /app

# System deps needed by asyncpg/bcrypt build chains
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render sets $PORT — bind to it (not a hardcoded 8000) so the platform can
# route traffic correctly. Migrations run first so a fresh deploy always has
# an up-to-date schema before the app starts serving.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
