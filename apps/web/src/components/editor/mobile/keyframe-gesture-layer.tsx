"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import type { Transform, VideoElement, ImageElement } from "@/types/timeline";
import { getTransformAtTime } from "@/lib/keyframes";

type PointerInfo = { x: number; y: number };

function isTransformable(
	element: { type: string } | undefined,
): element is VideoElement | ImageElement {
	return element?.type === "video" || element?.type === "image";
}

export function KeyframeGestureLayer({
	canvasRef,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const { isActive, activeKeyframeId } = useKeyframeEditorStore();
	const overlayRef = useRef<HTMLDivElement>(null);
	const [box, setBox] = useState<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);

	const pointers = useRef<Map<number, PointerInfo>>(new Map());
	const dragState = useRef<{
		startTransform: Transform;
		startCenter: PointerInfo;
		startDistance: number | null;
	} | null>(null);

	// Keep the overlay pixel-aligned with the canvas's displayed box,
	// regardless of how the browser has scaled it down to fit the screen.
	useEffect(() => {
		const canvas = canvasRef.current;
		const overlay = overlayRef.current;
		if (!canvas || !overlay) return;

		const update = () => {
			const parent = overlay.offsetParent as HTMLElement | null;
			const canvasBox = canvas.getBoundingClientRect();
			const parentBox = parent?.getBoundingClientRect();
			setBox({
				left: canvasBox.left - (parentBox?.left ?? 0),
				top: canvasBox.top - (parentBox?.top ?? 0),
				width: canvasBox.width,
				height: canvasBox.height,
			});
		};

		update();
		const observer = new ResizeObserver(update);
		observer.observe(canvas);
		window.addEventListener("resize", update);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", update);
		};
	}, [canvasRef]);

	const selection = selectedElements.length === 1 ? selectedElements[0] : null;
	const elementsWithTracks = selection
		? editor.timeline.getElementsWithTracks({ elements: [selection] })
		: [];
	const resolved = elementsWithTracks[0];
	const element = isTransformable(resolved?.element) ? resolved.element : null;

	const canEdit = isActive && !!element && !!box;

	const getElementLocalTime = useCallback(() => {
		if (!element) return 0;
		return editor.playback.getCurrentTime() - element.startTime;
	}, [editor.playback, element]);

	const getCurrentBaseTransform = useCallback((): Transform => {
		if (!element) {
			return { scale: 1, position: { x: 0, y: 0 }, rotate: 0 };
		}
		if (activeKeyframeId && element.keyframes) {
			const kf = element.keyframes.find((k) => k.id === activeKeyframeId);
			if (kf) return kf.transform;
		}
		return getTransformAtTime({
			transform: element.transform,
			keyframes: element.keyframes,
			localTime: getElementLocalTime(),
		});
	}, [element, activeKeyframeId, getElementLocalTime]);

	const applyLiveTransform = useCallback(
		(transform: Transform) => {
			if (!element || !resolved) return;
			const tracks = editor.timeline.getTracks();
			const updatedTracks = tracks.map((t) => {
				if (t.id !== resolved.track.id) return t;
				const newElements = t.elements.map((el) => {
					if (el.id !== element.id) return el;
					if (activeKeyframeId && "keyframes" in el && el.keyframes) {
						return {
							...el,
							keyframes: el.keyframes.map((kf) =>
								kf.id === activeKeyframeId ? { ...kf, transform } : kf,
							),
						};
					}
					return { ...el, transform };
				});
				return { ...t, elements: newElements } as typeof t;
			});
			editor.timeline.updateTracks(updatedTracks);
		},
		[element, resolved, editor.timeline, activeKeyframeId],
	);

	const commitTransform = useCallback(
		(transform: Transform) => {
			if (!element || !resolved) return;
			if (activeKeyframeId && element.keyframes) {
				const newKeyframes = element.keyframes.map((kf) =>
					kf.id === activeKeyframeId ? { ...kf, transform } : kf,
				);
				editor.timeline.updateElementTransform({
					trackId: resolved.track.id,
					elementId: element.id,
					updates: { keyframes: newKeyframes },
				});
			} else {
				editor.timeline.updateElementTransform({
					trackId: resolved.track.id,
					elementId: element.id,
					updates: { transform },
				});
			}
		},
		[element, resolved, editor.timeline, activeKeyframeId],
	);

	/** On-screen pixels -> project canvas-space pixels. */
	const getScreenToCanvasRatio = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !box || box.width === 0 || box.height === 0) {
			return { x: 1, y: 1 };
		}
		return {
			x: canvas.width / box.width,
			y: canvas.height / box.height,
		};
	}, [canvasRef, box]);

	const handlePointerDown = (e: React.PointerEvent) => {
		if (!canEdit) return;
		(e.target as Element).setPointerCapture(e.pointerId);
		pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (pointers.current.size === 1) {
			dragState.current = {
				startTransform: getCurrentBaseTransform(),
				startCenter: { x: e.clientX, y: e.clientY },
				startDistance: null,
			};
		} else if (pointers.current.size === 2) {
			const pts = Array.from(pointers.current.values());
			const dx = pts[0].x - pts[1].x;
			const dy = pts[0].y - pts[1].y;
			dragState.current = {
				startTransform: getCurrentBaseTransform(),
				startCenter: {
					x: (pts[0].x + pts[1].x) / 2,
					y: (pts[0].y + pts[1].y) / 2,
				},
				startDistance: Math.hypot(dx, dy),
			};
		}
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!canEdit || !pointers.current.has(e.pointerId)) return;
		pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (!dragState.current) return;

		const ratio = getScreenToCanvasRatio();

		if (pointers.current.size === 1) {
			const [p] = Array.from(pointers.current.values());
			const dx = (p.x - dragState.current.startCenter.x) * ratio.x;
			const dy = (p.y - dragState.current.startCenter.y) * ratio.y;

			applyLiveTransform({
				...dragState.current.startTransform,
				position: {
					x: dragState.current.startTransform.position.x + dx,
					y: dragState.current.startTransform.position.y + dy,
				},
			});
		} else if (pointers.current.size === 2) {
			const pts = Array.from(pointers.current.values());
			const dx = pts[0].x - pts[1].x;
			const dy = pts[0].y - pts[1].y;
			const distance = Math.hypot(dx, dy);
			const startDistance = dragState.current.startDistance || distance;
			const zoomRatio = startDistance > 0 ? distance / startDistance : 1;
			const nextScale = Math.max(
				0.2,
				Math.min(6, dragState.current.startTransform.scale * zoomRatio),
			);

			applyLiveTransform({
				...dragState.current.startTransform,
				scale: nextScale,
			});
		}
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		pointers.current.delete(e.pointerId);
		if (pointers.current.size === 0 && dragState.current) {
			commitTransform(getCurrentBaseTransform());
			dragState.current = null;
		}
	};

	if (!canEdit || !box) {
		return null;
	}

	return (
		<div
			ref={overlayRef}
			className="border-primary/70 absolute z-10 touch-none border-2 border-dashed"
			style={{
				left: box.left,
				top: box.top,
				width: box.width,
				height: box.height,
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
		/>
	);
}
