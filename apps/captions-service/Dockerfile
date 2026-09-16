FROM python:3.11-slim

# ffmpeg is required both for audio extraction and for burning the .ass
# subtitles back into the video via the libass filter.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data/uploads data/outputs

ENV WHISPER_MODEL_SIZE=base \
	WHISPER_DEVICE=cpu \
	WHISPER_COMPUTE_TYPE=int8 \
	UPLOAD_DIR=/app/data/uploads \
	OUTPUT_DIR=/app/data/outputs \
	PORT=5000

EXPOSE 5000

# gunicorn with a small worker count: transcription is CPU/GPU heavy per
# request, so we don't want many concurrent workers fighting for the same
# resource. Increase --timeout for longer videos.
RUN pip install --no-cache-dir gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "600", "app:app"]
