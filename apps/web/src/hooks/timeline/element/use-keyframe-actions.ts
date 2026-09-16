"use client";

import { useEditor } from "@/hooks/use-editor";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import { getTransformAtTime } from "@/lib/keyframes";
import { generateUUID } from "@/utils/id";
import type { ImageElement, VideoElement } from "@/types/timeline";

export function useKeyframeActions({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement | null;
	trackId: string | null;
}) {
	const editor = useEditor();
	const { activeKeyframeId, setActiveKeyframeId, setIsActive } =
		useKeyframeEditorStore();

	const keyframes = element?.keyframes ?? [];

	const addKeyframeAtPlayhead = () => {
		if (!element || !trackId) return;

		const localTime =
			editor.playback.getCurrentTime() - element.startTime;
		const clampedLocalTime = Math.max(0, Math.min(element.duration, localTime));

		const currentTransform = getTransformAtTime({
			transform: element.transform,
			keyframes: element.keyframes,
			localTime: clampedLocalTime,
		});

		const newKeyframe = {
			id: generateUUID(),
			time: clampedLocalTime,
			transform: currentTransform,
		};

		let newKeyframes = [...keyframes, newKeyframe];

		if (keyframes.length === 0 && clampedLocalTime > 0.05) {
			newKeyframes = [
				{ id: generateUUID(), time: 0, transform: element.transform },
				...newKeyframes,
			];
		}

		editor.timeline.updateElementTransform({
			trackId,
			elementId: element.id,
			updates: { keyframes: newKeyframes },
		});
		setActiveKeyframeId({ id: newKeyframe.id });
		setIsActive({ isActive: true });
	};

	const selectKeyframe = (id: string, time: number) => {
		if (!element) return;
		setActiveKeyframeId({ id });
		editor.playback.seek({ time: element.startTime + time });
	};

	const deleteActiveKeyframe = () => {
		if (!element || !trackId || !activeKeyframeId) return;
		const newKeyframes = keyframes.filter((kf) => kf.id !== activeKeyframeId);
		editor.timeline.updateElementTransform({
			trackId,
			elementId: element.id,
			updates: { keyframes: newKeyframes },
		});
		setActiveKeyframeId({ id: null });
	};

	return {
		keyframes,
		activeKeyframeId,
		addKeyframeAtPlayhead,
		selectKeyframe,
		deleteActiveKeyframe,
	};
}
