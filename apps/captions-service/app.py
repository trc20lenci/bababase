import os
import threading
import time
import uuid

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from caption_job import start_job_thread
from caption_styles import CAPTION_STYLES, DEFAULT_STYLE_ID, is_valid_position, is_valid_style

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "data/uploads")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "data/outputs")
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "500"))
API_KEY = os.environ.get("CAPTIONS_API_KEY")  # optional shared-secret auth
JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", str(60 * 60 * 6)))

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

ALLOWED_EXTENSIONS = {"mp4", "mov", "webm", "mkv", "m4v"}


def _require_api_key():
	if not API_KEY:
		return None
	provided = request.headers.get("X-API-Key")
	if provided != API_KEY:
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
			for path in (job.get("outputPath"),):
				if path and os.path.exists(path):
					try:
						os.remove(path)
					except OSError:
						pass


@app.route("/api/health", methods=["GET"])
def health():
	return jsonify({"status": "ok"})


@app.route("/api/styles", methods=["GET"])
def list_styles():
	return jsonify(
		{
			"styles": [
				{"id": style_id, "name": style["name"]}
				for style_id, style in CAPTION_STYLES.items()
			],
			"default": DEFAULT_STYLE_ID,
		}
	)


@app.route("/api/process", methods=["POST"])
def process_video():
	auth_error = _require_api_key()
	if auth_error:
		return auth_error

	_cleanup_expired_jobs()

	if "video" not in request.files:
		return jsonify({"error": "Missing 'video' file"}), 400

	file = request.files["video"]
	if file.filename == "":
		return jsonify({"error": "Empty filename"}), 400

	extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
	if extension not in ALLOWED_EXTENSIONS:
		return jsonify({"error": f"Unsupported file type: .{extension}"}), 400

	style_id = request.form.get("captionStyle", DEFAULT_STYLE_ID)
	if not is_valid_style(style_id):
		return jsonify({"error": f"Unknown captionStyle: {style_id}"}), 400

	position_percent = int(request.form.get("captionPosition", 15))
	if not is_valid_position(position_percent):
		return jsonify({"error": "captionPosition must be between 5 and 50"}), 400

	language = request.form.get("language") or None

	job_id = str(uuid.uuid4())
	filename = secure_filename(file.filename)
	input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")
	output_path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")
	file.save(input_path)

	with jobs_lock:
		jobs[job_id] = {
			"jobId": job_id,
			"status": "queued",
			"progress": 0,
			"createdAt": time.time(),
			"outputPath": output_path,
			"style": style_id,
		}

	start_job_thread(
		job_id=job_id,
		input_path=input_path,
		work_dir=UPLOAD_DIR,
		output_path=output_path,
		style_id=style_id,
		position_percent=position_percent,
		language=language,
		jobs=jobs,
		jobs_lock=jobs_lock,
	)

	return jsonify({"jobId": job_id, "status": "queued"}), 202


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
				"wordCount": job.get("wordCount"),
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

	return send_file(
		job["outputPath"],
		mimetype="video/mp4",
		as_attachment=True,
		download_name=f"captioned-{job_id}.mp4",
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
	port = int(os.environ.get("PORT", "5000"))
	app.run(host="0.0.0.0", port=port)
