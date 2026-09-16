import type { EditorCore } from "@/core";
import type {
	TrackType,
	TimelineTrack,
	TextElement,
	TimelineElement,
	ClipboardItem,
	Transform,
	TransformKeyframe,
} from "@/types/timeline";
import { calculateTotalDuration } from "@/lib/timeline";
import { videoCache } from "@/services/video-cache/service";
import {
	AddTrackCommand,
	RemoveTrackCommand,
	ToggleTrackMuteCommand,
	ToggleTrackVisibilityCommand,
	InsertElementCommand,
	UpdateElementTrimCommand,
	UpdateElementDurationCommand,
	DeleteElementsCommand,
	DuplicateElementsCommand,
	ToggleElementsVisibilityCommand,
	ToggleElementsMutedCommand,
	UpdateTextElementCommand,
	UpdateElementTransformCommand,
	InsertFreezeFrameCommand,
	SplitElementsCommand,
	PasteCommand,
	UpdateElementStartTimeCommand,
	MoveElementCommand,
} from "@/lib/commands/timeline";
import type { InsertElementParams } from "@/lib/commands/timeline/element/insert-element";

export class TimelineManager {
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	addTrack({ type, index }: { type: TrackType; index?: number }): string {
		const command = new AddTrackCommand(type, index);
		this.editor.command.execute({ command });
		return command.getTrackId();
	}

	removeTrack({ trackId }: { trackId: string }): void {
		const command = new RemoveTrackCommand(trackId);
		this.editor.command.execute({ command });
	}

	insertElement({ element, placement }: InsertElementParams): void {
		const command = new InsertElementCommand({ element, placement });
		this.editor.command.execute({ command });
	}

	updateElementTrim({
		elementId,
		trimStart,
		trimEnd,
		pushHistory = true,
	}: {
		elementId: string;
		trimStart: number;
		trimEnd: number;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateElementTrimCommand(elementId, trimStart, trimEnd);
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	updateElementDuration({
		trackId,
		elementId,
		duration,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		duration: number;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateElementDurationCommand(
			trackId,
			elementId,
			duration,
		);
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	updateElementStartTime({
		elements,
		startTime,
	}: {
		elements: { trackId: string; elementId: string }[];
		startTime: number;
	}): void {
		const command = new UpdateElementStartTimeCommand(elements, startTime);
		this.editor.command.execute({ command });
	}

	moveElement({
		sourceTrackId,
		targetTrackId,
		elementId,
		newStartTime,
		createTrack,
	}: {
		sourceTrackId: string;
		targetTrackId: string;
		elementId: string;
		newStartTime: number;
		createTrack?: { type: TrackType; index: number };
	}): void {
		const command = new MoveElementCommand(
			sourceTrackId,
			targetTrackId,
			elementId,
			newStartTime,
			createTrack,
		);
		this.editor.command.execute({ command });
	}

	toggleTrackMute({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackMuteCommand(trackId);
		this.editor.command.execute({ command });
	}

	toggleTrackVisibility({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackVisibilityCommand(trackId);
		this.editor.command.execute({ command });
	}

	splitElements({
		elements,
		splitTime,
		retainSide = "both",
	}: {
		elements: { trackId: string; elementId: string }[];
		splitTime: number;
		retainSide?: "both" | "left" | "right";
	}): { trackId: string; elementId: string }[] {
		const command = new SplitElementsCommand(elements, splitTime, retainSide);
		this.editor.command.execute({ command });
		return command.getRightSideElements();
	}

	getTotalDuration(): number {
		return calculateTotalDuration({ tracks: this.getTracks() });
	}

	getTrackById({ trackId }: { trackId: string }): TimelineTrack | null {
		return this.getTracks().find((track) => track.id === trackId) ?? null;
	}

	getElementsWithTracks({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): Array<{ track: TimelineTrack; element: TimelineElement }> {
		const result: Array<{ track: TimelineTrack; element: TimelineElement }> =
			[];

		for (const { trackId, elementId } of elements) {
			const track = this.getTrackById({ trackId });
			const element = track?.elements.find(
				(trackElement) => trackElement.id === elementId,
			);

			if (track && element) {
				result.push({ track, element });
			}
		}

		return result;
	}

	pasteAtTime({
		time,
		clipboardItems,
	}: {
		time: number;
		clipboardItems: ClipboardItem[];
	}): { trackId: string; elementId: string }[] {
		const command = new PasteCommand(time, clipboardItems);
		this.editor.command.execute({ command });
		return command.getPastedElements();
	}

	deleteElements({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new DeleteElementsCommand(elements);
		this.editor.command.execute({ command });
	}

	updateTextElement({
		trackId,
		elementId,
		updates,
	}: {
		trackId: string;
		elementId: string;
		updates: Partial<
			Pick<
				TextElement,
				| "content"
				| "fontSize"
				| "fontFamily"
				| "color"
				| "backgroundColor"
				| "textAlign"
				| "fontWeight"
				| "fontStyle"
				| "textDecoration"
				| "transform"
				| "opacity"
			>
		>;
	}): void {
		const command = new UpdateTextElementCommand(trackId, elementId, updates);
		this.editor.command.execute({ command });
	}

	updateElementTransform({
		trackId,
		elementId,
		updates,
	}: {
		trackId: string;
		elementId: string;
		updates: Partial<{
			transform: Transform;
			keyframes: TransformKeyframe[];
			opacity: number;
		}>;
	}): void {
		const command = new UpdateElementTransformCommand(
			trackId,
			elementId,
			updates,
		);
		this.editor.command.execute({ command });
	}

	/**
	 * Freezes the frame of a video element at `atLocalTime` (seconds into
	 * the clip) for `durationSeconds`, splitting the clip and rippling
	 * every later element on every track to make room.
	 */
	async insertFreezeFrame({
		trackId,
		elementId,
		atLocalTime,
		durationSeconds,
	}: {
		trackId: string;
		elementId: string;
		atLocalTime: number;
		durationSeconds: number;
	}): Promise<void> {
		const track = this.getTracks().find((t) => t.id === trackId);
		const element = track?.elements.find((el) => el.id === elementId);

		if (
			!track ||
			!element ||
			(element.type !== "video" && element.type !== "image")
		) {
			return;
		}

		const asset = this.editor.media
			.getAssets()
			.find((a) => a.id === element.mediaId);
		if (!asset) return;

		const clampedLocalTime = Math.max(
			0,
			Math.min(element.duration - 1 / 1000, atLocalTime),
		);
		const videoTime = clampedLocalTime + element.trimStart;
		const splitTime = element.startTime + clampedLocalTime;

		let blob: Blob;

		if (element.type === "video") {
			const frame = await videoCache.getFrameAt({
				mediaId: asset.id,
				file: asset.file,
				time: videoTime,
			});
			if (!frame) return;
			blob = await canvasToBlob(frame.canvas);
		} else {
			// Freezing a still image is just re-inserting the same image.
			blob = asset.file;
		}

		const activeProject = this.editor.project.getActive();
		const freezeFile = new File([blob], "freeze-frame.png", {
			type: blob.type || "image/png",
		});

		const freezeAsset = await this.editor.media.addMediaAsset({
			projectId: activeProject.id,
			asset: {
				name: "Freeze frame",
				type: "image",
				file: freezeFile,
				url: URL.createObjectURL(freezeFile),
				width: asset.width,
				height: asset.height,
				ephemeral: true,
			},
		});

		const command = new InsertFreezeFrameCommand(
			trackId,
			elementId,
			splitTime,
			durationSeconds,
			freezeAsset.id,
		);
		this.editor.command.execute({ command });
	}

	duplicateElements({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): { trackId: string; elementId: string }[] {
		const command = new DuplicateElementsCommand({ elements });
		this.editor.command.execute({ command });
		return command.getDuplicatedElements();
	}

	toggleElementsVisibility({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new ToggleElementsVisibilityCommand(elements);
		this.editor.command.execute({ command });
	}

	toggleElementsMuted({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new ToggleElementsMutedCommand(elements);
		this.editor.command.execute({ command });
	}

	getTracks(): TimelineTrack[] {
		return this.editor.scenes.getActiveScene()?.tracks ?? [];
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}

	updateTracks(newTracks: TimelineTrack[]): void {
		this.editor.scenes.updateSceneTracks({ tracks: newTracks });
		this.notify();
	}
}

function canvasToBlob(
	canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<Blob> {
	if ("convertToBlob" in canvas) {
		return canvas.convertToBlob({ type: "image/png" });
	}
	return new Promise((resolve, reject) => {
		(canvas as HTMLCanvasElement).toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Failed to capture frame"));
		}, "image/png");
	});
}
