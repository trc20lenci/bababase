# BASE Captions Service

A self-hosted transcription + animated-caption burn-in service, modeled on
[nicolaigaina/ai-video-captions](https://github.com/nicolaigaina/ai-video-captions)'s
backend: faster-whisper for word-level transcription, pysubs2 for animated
`.ass` subtitles, ffmpeg/libass to burn them into the video.

This runs on **your own server** and is called by the BASE web app's
`/api/captions/*` routes — it never talks to the browser directly.

## Run it

```bash
cp .env.example .env
# edit .env: set CAPTIONS_API_KEY to a random secret (openssl rand -hex 32)
docker compose up -d --build
```

Health check: `curl http://localhost:5000/api/health`

## Wire it into the BASE web app

In the web app's environment (`apps/web/.env.local` for dev, or your
hosting platform's env settings for production):

```
CAPTIONS_SERVICE_URL=https://your-server:5000
CAPTIONS_SERVICE_API_KEY=<the same value as CAPTIONS_API_KEY above>
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness check |
| GET | `/api/styles` | list caption style presets |
| POST | `/api/process` | upload a video (`multipart/form-data`, field `video`), plus `captionStyle` and `captionPosition` (5-50, % from bottom) |
| GET | `/api/status/:jobId` | poll progress (`queued` → `extracting_audio` → `transcribing` → `generating_subtitles` → `burning_in` → `completed`/`error`) |
| GET | `/api/download/:jobId` | download the captioned .mp4 once `completed` |
| DELETE | `/api/jobs/:jobId` | delete a job and its output file |

All endpoints except `/api/health` require an `X-API-Key` header matching
`CAPTIONS_API_KEY`, if that env var is set.

## Styles

`hormozi`, `mrbeast`, `karaoke`, `minimal`, `bounce`, `classic` — see
`caption_styles.py`. Each controls font, color, per-word animation, and
words-per-line.

## Performance

CPU-only with the `base` model is fine for testing but slow for long
videos. For production, either run on a machine with an NVIDIA GPU
(`WHISPER_DEVICE=cuda` in `.env`, plus the
[nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
on the host), or drop down to `WHISPER_MODEL_SIZE=tiny`/`small` for speed
over accuracy.
