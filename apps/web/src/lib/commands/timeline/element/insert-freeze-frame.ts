import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack, Transform } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import { SplitElementsCommand } from "./split-elements";

const DEFAULT_TRANSFORM: Transform = {
	scale: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

/**
 * Freeze-frame: splits the target element at `splitTime`, inserts a still
 * image of that exact frame for `durationSeconds`, and ripples every
 * element (on every track) that starts at or after the split point later
 * by that same amount -- so the whole timeline stays in sync instead of
 * just the one track.
 */
export class InsertFreezeFrameCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private previousSelection: { trackId: string; elementId: string }[] = [];

	constructor(
		private trackId: string,
		private elementId: string,
		private splitTime: number,
		private durationSeconds: number,
		private freezeMediaId: string,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		this.previousSelection = editor.selection.getSelectedElements();

		// Reuse the split logic directly (bypassing the undo stack -- this
		// whole operation collapses into a single undo step).
		const splitCommand = new SplitElementsCommand(
			[{ trackId: this.trackId, elementId: this.elementId }],
			this.splitTime,
			"both",
		);
		splitCommand.execute();

		const tracksAfterSplit = editor.timeline.getTracks();
		const EPSILON = 1 / 1000;

		const rippledTracks = tracksAfterSplit.map((track) => ({
			...track,
			elements: track.elements.map((el) =>
				el.startTime >= this.splitTime - EPSILON
					? { ...el, startTime: el.startTime + this.durationSeconds }
					: el,
			),
		})) as TimelineTrack[];

		const freezeFrameElement = {
			id: generateUUID(),
			name: "Freeze frame",
			type: "image" as const,
			mediaId: this.freezeMediaId,
			startTime: this.splitTime,
			duration: this.durationSeconds,
			trimStart: 0,
			trimEnd: 0,
			transform: DEFAULT_TRANSFORM,
			opacity: 1,
		};

		const finalTracks = rippledTracks.map((track) =>
			track.id === this.trackId
				? { ...track, elements: [...track.elements, freezeFrameElement] }
				: track,
		) as TimelineTrack[];

		editor.timeline.updateTracks(finalTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
			editor.selection.setSelectedElements({
				elements: this.previousSelection,
			});
		}
	}
}
