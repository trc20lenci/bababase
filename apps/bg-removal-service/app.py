import os
import threading
import time
import uuid

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from bg_removal_job import start_job_thread

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "data/uploads")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "data/outputs")
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "300"))
API_KEY = os.environ.get("BG_REMOVAL_API_KEY")
JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", str(60 * 60 * 6)))

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "mkv", "m4v"}
VALID_BACKGROUNDS = {"transparent", "green", "color"}


def _require_api_key():
	if not API_KEY:
		return None
	if request.headers.get("X-API-Key") != API_KEY:
		return jsonify({"error": "Unauthorized"}), 401
	return None


def _cleanup_expired_jobs():
	now = time.time()
	with jobs_lock:
		expired = [
			job_id
			for job_id, job in jobs.items()
			if now - job.get("createdAt", now) > JOB_TTL_SECONDS
		]
		for job_id in expired:
			job = jobs.pop(job_id)
			path = job.get("outputPath")
			if path and os.path.exists(path):
				try:
					os.remove(path)
				except OSError:
					pass


@app.route("/api/health", methods=["GET"])
def health():
	return jsonify({"status": "ok"})


@app.route("/api/process", methods=["POST"])
def process_media():
	auth_error = _require_api_key()
	if auth_error:
		return auth_error

	_cleanup_expired_jobs()

	if "file" not in request.files:
		return jsonify({"error": "Missing 'file'"}), 400

	file = request.files["file"]
	if file.filename == "":
		return jsonify({"error": "Empty filename"}), 400

	extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
	if extension in IMAGE_EXTENSIONS:
		media_type = "image"
	elif extension in VIDEO_EXTENSIONS:
		media_type = "video"
	else:
		return jsonify({"error": f"Unsupported file type: .{extension}"}), 400

	background = request.form.get("background", "transparent")
	if background not in VALID_BACKGROUNDS:
		return jsonify({"error": f"Unknown background: {background}"}), 400

	color = request.form.get("color", "#00FF00")

	job_id = str(uuid.uuid4())
	filename = secure_filename(file.filename)
	input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")

	if media_type == "image":
		out_ext = "png"
	else:
		out_ext = "webm" if background == "transparent" else "mp4"
	output_path = os.path.join(OUTPUT_DIR, f"{job_id}.{out_ext}")

	file.save(input_path)

	with jobs_lock:
		jobs[job_id] = {
			"jobId": job_id,
			"status": "queued",
			"progress": 0,
			"createdAt": time.time(),
			"outputPath": output_path,
			"mediaType": media_type,
			"outputExtension": out_ext,
		}

	start_job_thread(
		job_id=job_id,
		input_path=input_path,
		work_dir=UPLOAD_DIR,
		output_path=output_path,
		media_type=media_type,
		background=background,
		color=color,
		jobs=jobs,
		jobs_lock=jobs_lock,
	)

	return jsonify({"jobId": job_id, "status": "queued", "mediaType": media_type}), 202


@app.route("/api/status/<job_id>", methods=["GET"])
def job_status(job_id: str):
	with jobs_lock:
		job = jobs.get(job_id)
		if job is None:
			return jsonify({"error": "Job not found"}), 404
		return jsonify(
			{
				"jobId": job_id,
				"status": job["status"],
				"progress": job["progress"],
				"error": job.get("error"),
				"mediaType": job.get("mediaType"),
				"outputExtension": job.get("outputExtension"),
			}
		)


@app.route("/api/download/<job_id>", methods=["GET"])
def download(job_id: str):
	with jobs_lock:
		job = jobs.get(job_id)

	if job is None:
		return jsonify({"error": "Job not found"}), 404
	if job["status"] != "completed":
		return jsonify({"error": "Job is not finished yet", "status": job["status"]}), 409
	if not os.path.exists(job["outputPath"]):
		return jsonify({"error": "Output file is missing"}), 410

	mimetype = "image/png" if job["mediaType"] == "image" else (
		"video/webm" if job["outputExtension"] == "webm" else "video/mp4"
	)

	return send_file(
		job["outputPath"],
		mimetype=mimetype,
		as_attachment=True,
		download_name=f"no-bg-{job_id}.{job['outputExtension']}",
	)


@app.route("/api/jobs/<job_id>", methods=["DELETE"])
def delete_job(job_id: str):
	with jobs_lock:
		job = jobs.pop(job_id, None)

	if job is None:
		return jsonify({"error": "Job not found"}), 404

	output_path = job.get("outputPath")
	if output_path and os.path.exists(output_path):
		try:
			os.remove(output_path)
		except OSError:
			pass

	return jsonify({"deleted": True})


if __name__ == "__main__":
	port = int(os.environ.get("PORT", "5001"))
	app.run(host="0.0.0.0", port=port)
