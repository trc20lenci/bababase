"""
The core processing pipeline: extract audio -> transcribe with
faster-whisper (word-level timestamps) -> generate animated .ass
subtitles -> burn them into the video with ffmpeg.

Runs in a background thread per job; progress is written onto the
shared `jobs` dict so the API can report status while it works.
"""

import json
import os
import subprocess
import threading
import time
import traceback

from faster_whisper import WhisperModel

from subtitles import generate_ass_subtitles

MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")  # "cuda" if you have a GPU
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

_model_lock = threading.Lock()
_model: WhisperModel | None = None


def get_model() -> WhisperModel:
	"""Lazily loads the Whisper model once per process and reuses it for
	every job, since loading it is the slowest part by far."""
	global _model
	with _model_lock:
		if _model is None:
			_model = WhisperModel(
				MODEL_SIZE,
				device=DEVICE,
				compute_type=COMPUTE_TYPE,
			)
		return _model


def _run_ffmpeg(args: list[str]) -> None:
	result = subprocess.run(
		["ffmpeg", "-y", *args],
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE,
	)
	if result.returncode != 0:
		raise RuntimeError(f"ffmpeg failed: {result.stderr.decode(errors='ignore')[-2000:]}")


def _probe_dimensions(input_path: str) -> tuple[int, int]:
	result = subprocess.run(
		[
			"ffprobe",
			"-v",
			"error",
			"-select_streams",
			"v:0",
			"-show_entries",
			"stream=width,height",
			"-of",
			"json",
			input_path,
		],
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE,
	)
	data = json.loads(result.stdout.decode())
	stream = data["streams"][0]
	return int(stream["width"]), int(stream["height"])


def _extract_audio(input_path: str, audio_path: str) -> None:
	_run_ffmpeg(
		[
			"-i",
			input_path,
			"-vn",
			"-acodec",
			"pcm_s16le",
			"-ar",
			"16000",
			"-ac",
			"1",
			audio_path,
		]
	)


def _transcribe(audio_path: str, language: str | None) -> list[dict]:
	model = get_model()
	segments, _info = model.transcribe(
		audio_path,
		word_timestamps=True,
		language=language,
		vad_filter=True,
	)

	words: list[dict] = []
	for segment in segments:
		if not segment.words:
			continue
		for w in segment.words:
			words.append(
				{
					"word": w.word,
					"start": w.start,
					"end": w.end,
				}
			)
	return words


def _burn_subtitles(input_path: str, ass_path: str, output_path: str) -> None:
	# libass needs a forward-slash, colon-escaped path when used inside a
	# filtergraph argument.
	escaped = ass_path.replace("\\", "/").replace(":", "\\:")
	_run_ffmpeg(
		[
			"-i",
			input_path,
			"-vf",
			f"ass={escaped}",
			"-c:v",
			"libx264",
			"-preset",
			"fast",
			"-crf",
			"20",
			"-c:a",
			"copy",
			output_path,
		]
	)


def process_job(
	*,
	job_id: str,
	input_path: str,
	work_dir: str,
	output_path: str,
	style_id: str,
	position_percent: int,
	language: str | None,
	jobs: dict,
	jobs_lock: threading.Lock,
) -> None:
	def set_status(**fields):
		with jobs_lock:
			jobs[job_id].update(fields)

	try:
		set_status(status="extracting_audio", progress=10)
		audio_path = os.path.join(work_dir, f"{job_id}.wav")
		_extract_audio(input_path, audio_path)

		set_status(status="transcribing", progress=30)
		width, height = _probe_dimensions(input_path)
		words = _transcribe(audio_path, language)

		if not words:
			set_status(
				status="error",
				progress=100,
				error="No speech detected in this video.",
			)
			return

		set_status(status="generating_subtitles", progress=65)
		ass_path = os.path.join(work_dir, f"{job_id}.ass")
		generate_ass_subtitles(
			words=words,
			style_id=style_id,
			position_percent=position_percent,
			video_width=width,
			video_height=height,
			output_path=ass_path,
		)

		set_status(status="burning_in", progress=80)
		_burn_subtitles(input_path, ass_path, output_path)

		set_status(
			status="completed",
			progress=100,
			completedAt=time.time(),
			wordCount=len(words),
		)

	except Exception as exc:  # noqa: BLE001 - report any failure to the client
		traceback.print_exc()
		set_status(status="error", progress=100, error=str(exc))
	finally:
		for path in (input_path,):
			try:
				# Keep the source only long enough to process it.
				os.remove(path)
			except OSError:
				pass


def start_job_thread(**kwargs) -> threading.Thread:
	thread = threading.Thread(target=process_job, kwargs=kwargs, daemon=True)
	thread.start()
	return thread
