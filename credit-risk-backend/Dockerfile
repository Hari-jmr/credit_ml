FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev

COPY app.py ./
COPY model_outputs/ ./model_outputs/

ENV MODEL_DIR=model_outputs
ENV OLLAMA_MODEL=granite4.1:3b
ENV OLLAMA_HOST=host.docker.internal

EXPOSE 5230

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5230"]
