# BASE Background Removal Service

Self-hosted background removal, modeled on
[ecsplendid/rembg-greenscreen](https://github.com/ecsplendid/rembg-greenscreen):
[rembg](https://github.com/danielgatis/rembg) (U-2-Net via onnxruntime)
strips the background from images, or from every frame of a video
(extracted/reassembled with ffmpeg).

Runs on **your own server**, called by the BASE web app's
`/api/background-removal/*` routes.

## Run it

```bash
cp .env.example .env
# edit .env: set BG_REMOVAL_API_KEY to a random secret
docker compose up -d --build
```

The first build bakes the U-2-Net model into the image (~180MB) so
requests don't stall downloading it.

## Wire it into the BASE web app

```
BG_REMOVAL_SERVICE_URL=https://your-server:5001
BG_REMOVAL_SERVICE_API_KEY=<same as BG_REMOVAL_API_KEY above>
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness check |
| POST | `/api/process` | upload `file` (image or video), `background` = `transparent`/`green`/`color`, `color` = hex if `color` |
| GET | `/api/status/:jobId` | poll progress |
| GET | `/api/download/:jobId` | download result once `completed` (PNG for images, WebM-alpha or MP4-on-color for video) |
| DELETE | `/api/jobs/:jobId` | delete a job and its output |

All endpoints except `/api/health` require `X-API-Key` if `BG_REMOVAL_API_KEY` is set.

## Performance

CPU-only, this is genuinely slow for video -- every frame gets a full
segmentation pass. A 10s/30fps clip is 300 frames. Fine for short clips
and testing; for longer video either accept the wait, run on a beefier
CPU box, or swap `REMBG_MODEL=u2netp` (smaller/faster, a bit less
accurate) via `.env`.
