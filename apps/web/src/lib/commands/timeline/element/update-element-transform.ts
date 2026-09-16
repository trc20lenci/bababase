import { Command } from "@/lib/commands/base-command";
import type { Transform, TimelineTrack, TransformKeyframe } from "@/types/timeline";
import { EditorCore } from "@/core";

type TransformableElement = {
	transform: Transform;
	keyframes?: TransformKeyframe[];
	opacity: number;
};

export class UpdateElementTransformCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private trackId: string,
		private elementId: string,
		private updates: Partial<TransformableElement>,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = this.savedState.map((t) => {
			if (t.id !== this.trackId) return t;
			const newElements = t.elements.map((el) =>
				el.id === this.elementId &&
				(el.type === "video" ||
					el.type === "image" ||
					el.type === "text" ||
					el.type === "sticker")
					? { ...el, ...this.updates }
					: el,
			);
			return { ...t, elements: newElements } as typeof t;
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
