FROM python:3.11-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg libgl1 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data/uploads data/outputs

ENV REMBG_MODEL=u2net \
	UPLOAD_DIR=/app/data/uploads \
	OUTPUT_DIR=/app/data/outputs \
	PORT=5001

# rembg downloads its ONNX model on first use and caches it in
# ~/.u2net -- bake it into the image at build time so the first real
# request isn't stuck downloading it.
RUN python -c "from rembg import new_session; new_session('u2net')"

EXPOSE 5001

# One worker: onnxruntime sessions aren't cheap to duplicate per-process,
# and CPU inference is already the bottleneck -- more workers just makes
# them compete for the same cores. --threads lets it still serve /health
# and /status while a /process job is crunching.
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "1", "--threads", "4", "--timeout", "1200", "app:app"]
