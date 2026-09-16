"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Download04Icon,
	SparklesIcon,
	AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { getExportMimeType, getExportFileExtension } from "@/lib/export";
import { DEFAULT_EXPORT_OPTIONS } from "@/constants/export-constants";

type StyleOption = { id: string; name: string };

type JobStatus =
	| "idle"
	| "exporting"
	| "uploading"
	| "queued"
	| "extracting_audio"
	| "transcribing"
	| "generating_subtitles"
	| "burning_in"
	| "completed"
	| "error";

const STATUS_LABELS: Record<JobStatus, string> = {
	idle: "",
	exporting: "Рендерим видео...",
	uploading: "Загружаем на сервер...",
	queued: "В очереди...",
	extracting_audio: "Извлекаем звук...",
	transcribing: "Распознаём речь...",
	generating_subtitles: "Строим субтитры...",
	burning_in: "Встраиваем в видео...",
	completed: "Готово!",
	error: "Ошибка",
};

const STATUS_PROGRESS: Partial<Record<JobStatus, number>> = {
	exporting: 5,
	uploading: 10,
};

export function Captions() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();

	const [available, setAvailable] = useState<boolean | null>(null);
	const [styles, setStyles] = useState<StyleOption[]>([]);
	const [selectedStyle, setSelectedStyle] = useState<string>("classic");
	const [position, setPosition] = useState(15);
	const [status, setStatus] = useState<JobStatus>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [jobId, setJobId] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		fetch("/api/captions/styles")
			.then((r) => r.json())
			.then((data) => {
				setAvailable(!!data.available);
				if (data.styles?.length) {
					setStyles(data.styles);
					setSelectedStyle(data.default ?? data.styles[0].id);
				}
			})
			.catch(() => setAvailable(false));

		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, []);

	const pollStatus = (id: string) => {
		pollRef.current = setInterval(async () => {
			try {
				const res = await fetch(`/api/captions/status/${id}`);
				const data = await res.json();

				if (!res.ok) {
					setStatus("error");
					setError(data.error ?? "Не удалось получить статус");
					if (pollRef.current) clearInterval(pollRef.current);
					return;
				}

				setStatus(data.status);
				setProgress(data.progress ?? 0);

				if (data.status === "completed" || data.status === "error") {
					if (data.status === "error") setError(data.error);
					if (pollRef.current) clearInterval(pollRef.current);
				}
			} catch {
				setStatus("error");
				setError("Соединение потеряно");
				if (pollRef.current) clearInterval(pollRef.current);
			}
		}, 2000);
	};

	const handleGenerate = async () => {
		if (!activeProject) return;
		setError(null);
		setJobId(null);
		setProgress(0);

		try {
			setStatus("exporting");
			const result = await editor.project.export({
				options: {
					...DEFAULT_EXPORT_OPTIONS,
					format: "mp4",
					fps: activeProject.settings.fps,
					includeAudio: true,
					onProgress: () => {},
					onCancel: () => false,
				},
			});

			if (!result.success || !result.buffer) {
				setStatus("error");
				setError("Не удалось отрендерить видео для субтитров");
				return;
			}

			setStatus("uploading");
			const mimeType = getExportMimeType({ format: "mp4" });
			const extension = getExportFileExtension({ format: "mp4" });
			const blob = new Blob([result.buffer], { type: mimeType });
			const file = new File([blob], `${activeProject.metadata.name}${extension}`, {
				type: mimeType,
			});

			const form = new FormData();
			form.set("video", file);
			form.set("captionStyle", selectedStyle);
			form.set("captionPosition", String(position));

			const response = await fetch("/api/captions/process", {
				method: "POST",
				body: form,
			});
			const data = await response.json();

			if (!response.ok) {
				setStatus("error");
				setError(data.error ?? "Не удалось запустить обработку");
				return;
			}

			setJobId(data.jobId);
			setStatus("queued");
			pollStatus(data.jobId);
		} catch {
			setStatus("error");
			setError("Что-то пошло не так");
		}
	};

	if (available === null) {
		return (
			<div className="text-muted-foreground p-6 text-center text-sm">
				Загрузка...
			</div>
		);
	}

	if (!available) {
		return (
			<div className="flex flex-col items-center gap-3 p-6 text-center">
				<HugeiconsIcon
					icon={AlertCircleIcon}
					className="text-muted-foreground size-8"
				/>
				<p className="text-sm font-medium">Серверные субтитры не настроены</p>
				<p className="text-muted-foreground text-xs">
					Задайте CAPTIONS_SERVICE_URL в окружении веб-приложения, указав
					адрес вашего captions-сервиса (apps/captions-service).
				</p>
			</div>
		);
	}

	const isBusy = status !== "idle" && status !== "completed" && status !== "error";

	return (
		<div className="flex flex-col gap-5 p-5">
			<div>
				<h3 className="text-sm font-medium">Стиль субтитров</h3>
				<div className="mt-2 grid grid-cols-3 gap-2">
					{styles.map((style) => (
						<button
							key={style.id}
							type="button"
							disabled={isBusy}
							onClick={() => setSelectedStyle(style.id)}
							className={`rounded-lg border px-2 py-2.5 text-xs font-medium ${
								selectedStyle === style.id
									? "border-primary text-primary bg-primary/10"
									: "border-border text-muted-foreground"
							}`}
						>
							{style.name}
						</button>
					))}
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium">Позиция</h3>
					<span className="text-muted-foreground text-xs">{position}% снизу</span>
				</div>
				<Slider
					className="mt-2"
					value={[position]}
					min={5}
					max={50}
					step={1}
					disabled={isBusy}
					onValueChange={([v]) => setPosition(v)}
				/>
			</div>

			<Button
				type="button"
				size="lg"
				className="gap-2"
				disabled={isBusy}
				onClick={handleGenerate}
			>
				<HugeiconsIcon icon={SparklesIcon} className="size-4" />
				{isBusy ? STATUS_LABELS[status] : "Создать субтитры"}
			</Button>

			{isBusy && (
				<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
					<div
						className="bg-primary h-full transition-all"
						style={{
							width: `${Math.max(progress, STATUS_PROGRESS[status] ?? 0)}%`,
						}}
					/>
				</div>
			)}

			{status === "error" && error && (
				<p className="text-destructive text-center text-xs">{error}</p>
			)}

			{status === "completed" && jobId && (
				<Button asChild size="lg" variant="outline" className="gap-2">
					<a href={`/api/captions/download/${jobId}`} download>
						<HugeiconsIcon icon={Download04Icon} className="size-4" />
						Скачать видео с субтитрами
					</a>
				</Button>
			)}
		</div>
	);
}
