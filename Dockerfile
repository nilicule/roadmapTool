FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies (cached layer — only re-runs when lockfile changes)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application
COPY src/ src/
COPY static/ static/

EXPOSE 5006

# Mount your roadmap.yaml over /app/roadmap.yaml to persist data:
#   docker run -v /host/path/roadmap.yaml:/app/roadmap.yaml ...
CMD ["uv", "run", "app"]
