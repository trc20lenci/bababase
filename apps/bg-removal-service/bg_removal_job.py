"""
Background removal pipeline, modeled on ecsplendid/rembg-greenscreen:
rembg (U-2-Net/ISNet via onnxruntime) removes the background from each
frame; ffmpeg handles frame extraction/reassembly. Runs in a background
thread per job.

Images: a single rembg pass.
Video: extract frames -> rembg each one (reusing one session, which is
the expensive part to set up) -> reassemble, either as a transparent
WebM (alpha channel) or composited over a solid color ("green screen").
"""

import os
import shutil
import subprocess
import threading
import time
import traceback

from PIL import Image
from rembg import remove, new_session

MODEL_NAME = os.environ.get("REMBG_MODEL", "u2net")  # u2net, u2netp (faster/lighter), isnet-general-use

_session_lock = threading.Lock()
_session = None


def get_session():
	global _session
	with _session_lock:
		if _session is None:
			_session = new_session(MODEL_NAME)
		return _session


def _run_ffmpeg(args: list[str]) -> None:
	result = subprocess.run(
		["ffmpeg", "-y", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE
	)
	if result.returncode != 0:
		raise RuntimeError(f"ffmpeg failed: {result.stderr.decode(errors='ignore')[-2000:]}")


def _probe_fps(input_path: str) -> float:
	result = subprocess.run(
		[
			"ffprobe", "-v", "error", "-select_streams", "v:0",
			"-show_entries", "stream=r_frame_rate", "-of",
			"default=noprint_wrappers=1:nokey=1", input_path,
		],
		stdout=subprocess.PIPE, stderr=subprocess.PIPE,
	)
	raw = result.stdout.decode().strip()
	if "/" in raw:
		num, den = raw.split("/")
		return float(num) / float(den) if float(den) != 0 else 30.0
	return float(raw) if raw else 30.0


def _process_image(
	input_path: str, output_path: str, background: str, color: str
) -> None:
	with open(input_path, "rb") as f:
		input_bytes = f.read()

	cutout_bytes = remove(input_bytes, session=get_session())

	if background == "transparent":
		with open(output_path, "wb") as f:
			f.write(cutout_bytes)
		return

	import io

	cutout = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
	bg_color = _hex_to_rgb(color) if background == "color" else (0, 255, 0)
	canvas = Image.new("RGBA", cutout.size, (*bg_color, 255))
	canvas.alpha_composite(cutout)
	canvas.convert("RGB").save(output_path, "PNG")


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
	h = hex_color.lstrip("#")
	if len(h) != 6:
		return (0, 255, 0)
	return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _process_video(
	*,
	input_path: str,
	output_path: str,
	work_dir: str,
	job_id: str,
	background: str,
	color: str,
	set_status,
) -> None:
	frames_dir = os.path.join(work_dir, f"{job_id}_frames")
	cutout_dir = os.path.join(work_dir, f"{job_id}_cutout")
	os.makedirs(frames_dir, exist_ok=True)
	os.makedirs(cutout_dir, exist_ok=True)

	try:
		fps = _probe_fps(input_path)

		set_status(status="extracting_frames", progress=10)
		_run_ffmpeg(
			["-i", input_path, os.path.join(frames_dir, "frame_%06d.png")]
		)

		frame_files = sorted(os.listdir(frames_dir))
		total = len(frame_files) or 1
		session = get_session()

		set_status(status="removing_background", progress=20)
		for i, frame_file in enumerate(frame_files):
			src = os.path.join(frames_dir, frame_file)
			dst = os.path.join(cutout_dir, frame_file)
			with open(src, "rb") as f:
				cutout_bytes = remove(f.read(), session=session)

			if background == "transparent":
				with open(dst, "wb") as f:
					f.write(cutout_bytes)
			else:
				import io

				cutout = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
				bg_color = _hex_to_rgb(color) if background == "color" else (0, 255, 0)
				canvas = Image.new("RGBA", cutout.size, (*bg_color, 255))
				canvas.alpha_composite(cutout)
				canvas.convert("RGB").save(dst, "PNG")

			if i % 5 == 0:
				progress = 20 + int((i / total) * 60)
				set_status(status="removing_background", progress=progress)

		set_status(status="encoding", progress=85)

		has_audio = (
			subprocess.run(
				["ffprobe", "-v", "error", "-select_streams", "a:0",
				 "-show_entries", "stream=index", "-of", "csv=p=0", input_path],
				stdout=subprocess.PIPE, stderr=subprocess.PIPE,
			).stdout.strip()
			!= b""
		)
		audio_args = ["-i", input_path, "-map", "1:a:0", "-c:a", "aac"] if has_audio else []

		if background == "transparent":
			# VP9 + yuva420p keeps the alpha channel (mp4/h264 cannot).
			_run_ffmpeg(
				[
					"-framerate", str(fps),
					"-i", os.path.join(cutout_dir, "frame_%06d.png"),
					*audio_args,
					"-map", "0:v",
					"-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
					"-auto-alt-ref", "0",
					output_path,
				]
			)
		else:
			_run_ffmpeg(
				[
					"-framerate", str(fps),
					"-i", os.path.join(cutout_dir, "frame_%06d.png"),
					*audio_args,
					"-map", "0:v",
					"-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
					output_path,
				]
			)
	finally:
		shutil.rmtree(frames_dir, ignore_errors=True)
		shutil.rmtree(cutout_dir, ignore_errors=True)


def process_job(
	*,
	job_id: str,
	input_path: str,
	work_dir: str,
	output_path: str,
	media_type: str,  # "image" | "video"
	background: str,  # "transparent" | "green" | "color"
	color: str,
	jobs: dict,
	jobs_lock: threading.Lock,
) -> None:
	def set_status(**fields):
		with jobs_lock:
			jobs[job_id].update(fields)

	try:
		if media_type == "image":
			set_status(status="removing_background", progress=30)
			_process_image(input_path, output_path, background, color)
		else:
			_process_video(
				input_path=input_path,
				output_path=output_path,
				work_dir=work_dir,
				job_id=job_id,
				background=background,
				color=color,
				set_status=set_status,
			)

		set_status(status="completed", progress=100, completedAt=time.time())
	except Exception as exc:  # noqa: BLE001
		traceback.print_exc()
		set_status(status="error", progress=100, error=str(exc))
	finally:
		try:
			os.remove(input_path)
		except OSError:
			pass


def start_job_thread(**kwargs) -> threading.Thread:
	thread = threading.Thread(target=process_job, kwargs=kwargs, daemon=True)
	thread.start()
	return thread
