"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Download04Icon,
	SparklesIcon,
	AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import type { ImageElement, VideoElement } from "@/types/timeline";
import { cn } from "@/utils/ui";

type Background = "transparent" | "green" | "color";

type JobStatus =
	| "idle"
	| "uploading"
	| "queued"
	| "extracting_frames"
	| "removing_background"
	| "encoding"
	| "completed"
	| "error";

const STATUS_LABELS: Record<JobStatus, string> = {
	idle: "",
	uploading: "Загружаем...",
	queued: "В очереди...",
	extracting_frames: "Извлекаем кадры...",
	removing_background: "Удаляем фон...",
	encoding: "Собираем видео...",
	completed: "Готово!",
	error: "Ошибка",
};

const BACKGROUND_OPTIONS: { id: Background; label: string }[] = [
	{ id: "transparent", label: "Прозрачный" },
	{ id: "green", label: "Хромакей" },
	{ id: "color", label: "Свой цвет" },
];

function isTransformable(
	element: { type: string } | undefined,
): element is VideoElement | ImageElement {
	return element?.type === "video" || element?.type === "image";
}

export function BackgroundRemovalView() {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const [available, setAvailable] = useState<boolean | null>(null);
	const [background, setBackground] = useState<Background>("transparent");
	const [color, setColor] = useState("#00FF00");
	const [status, setStatus] = useState<JobStatus>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [jobId, setJobId] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		fetch("/api/background-removal/availability")
			.then((r) => r.json())
			.then((data) => setAvailable(!!data.available))
			.catch(() => setAvailable(false));
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, []);

	const selection = selectedElements.length === 1 ? selectedElements[0] : null;
	const resolved = selection
		? editor.timeline.getElementsWithTracks({ elements: [selection] })[0]
		: undefined;
	const element = isTransformable(resolved?.element) ? resolved.element : null;
	const asset = element
		? editor.media.getAssets().find((a) => a.id === element.mediaId)
		: null;

	const pollStatus = (id: string) => {
		pollRef.current = setInterval(async () => {
			try {
				const res = await fetch(`/api/background-removal/status/${id}`);
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

	const handleStart = async () => {
		if (!asset) return;
		setError(null);
		setJobId(null);
		setProgress(0);
		setStatus("uploading");

		try {
			const form = new FormData();
			form.set("file", asset.file);
			form.set("background", background);
			if (background === "color") form.set("color", color);

			const response = await fetch("/api/background-removal/process", {
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
				<p className="text-sm font-medium">Удаление фона не настроено</p>
				<p className="text-muted-foreground text-xs">
					Задайте BG_REMOVAL_SERVICE_URL в окружении веб-приложения, указав
					адрес вашего сервиса (apps/bg-removal-service).
				</p>
			</div>
		);
	}

	if (!element || !asset) {
		return (
			<div className="text-muted-foreground p-6 text-center text-sm">
				Выберите видео или фото на таймлайне
			</div>
		);
	}

	const isBusy = status !== "idle" && status !== "completed" && status !== "error";

	return (
		<div className="flex flex-col gap-5 p-5">
			<div>
				<h3 className="text-sm font-medium">Фон</h3>
				<div className="mt-2 grid grid-cols-3 gap-2">
					{BACKGROUND_OPTIONS.map((opt) => (
						<button
							key={opt.id}
							type="button"
							disabled={isBusy}
							onClick={() => setBackground(opt.id)}
							className={cn(
								"rounded-lg border px-2 py-2.5 text-xs font-medium",
								background === opt.id
									? "border-primary text-primary bg-primary/10"
									: "border-border text-muted-foreground",
							)}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{background === "color" && (
				<div className="flex items-center gap-3">
					<input
						type="color"
						value={color}
						disabled={isBusy}
						onChange={(e) => setColor(e.target.value)}
						className="size-9 shrink-0 rounded border"
					/>
					<Input
						value={color}
						disabled={isBusy}
						onChange={(e) => setColor(e.target.value)}
						className="flex-1"
					/>
				</div>
			)}

			<p className="text-muted-foreground text-xs">
				{element.type === "video"
					? "Видео обрабатывается покадрово — может занять время."
					: "Фото обрабатывается за секунды."}
			</p>

			<Button
				type="button"
				size="lg"
				className="gap-2"
				disabled={isBusy}
				onClick={handleStart}
			>
				<HugeiconsIcon icon={SparklesIcon} className="size-4" />
				{isBusy ? STATUS_LABELS[status] : "Удалить фон"}
			</Button>

			{isBusy && (
				<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
					<div
						className="bg-primary h-full transition-all"
						style={{ width: `${Math.max(progress, 5)}%` }}
					/>
				</div>
			)}

			{status === "error" && error && (
				<p className="text-destructive text-center text-xs">{error}</p>
			)}

			{status === "completed" && jobId && (
				<Button asChild size="lg" variant="outline" className="gap-2">
					<a href={`/api/background-removal/download/${jobId}`} download>
						<HugeiconsIcon icon={Download04Icon} className="size-4" />
						Скачать результат
					</a>
				</Button>
			)}
		</div>
	);
}
