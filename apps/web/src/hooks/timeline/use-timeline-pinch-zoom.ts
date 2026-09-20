import { type RefObject, useEffect, useRef } from "react";

interface UseTimelinePinchZoomProps {
	containerRef: RefObject<HTMLElement | null>;
	zoomLevel: number;
	setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
	minZoom: number;
	maxZoom: number;
	/** Zoom level applied on double-tap, as an escape hatch if pinch ever
	 * leaves the timeline zoomed further than the user wants. */
	resetZoom?: number;
}

/**
 * Two-finger pinch to zoom the timeline in/out on touch devices, plus
 * double-tap to reset to `resetZoom`. Kept entirely separate from the
 * existing wheel/ctrl-based desktop zoom (both just call the same
 * `setZoomLevel`), so this can't regress desktop behaviour.
 */
export function useTimelinePinchZoom({
	containerRef,
	zoomLevel,
	setZoomLevel,
	minZoom,
	maxZoom,
	resetZoom,
}: UseTimelinePinchZoomProps) {
	const startDistanceRef = useRef<number | null>(null);
	const startZoomRef = useRef(zoomLevel);
	const zoomLevelRef = useRef(zoomLevel);
	const lastTapRef = useRef(0);
	const resetZoomRef = useRef(resetZoom);

	useEffect(() => {
		resetZoomRef.current = resetZoom;
	}, [resetZoom]);

	useEffect(() => {
		zoomLevelRef.current = zoomLevel;
	}, [zoomLevel]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const getDistance = (touches: TouchList) => {
			const [a, b] = [touches[0], touches[1]];
			return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
		};

		const handleTouchStart = (event: TouchEvent) => {
			if (event.touches.length === 2) {
				startDistanceRef.current = getDistance(event.touches);
				startZoomRef.current = zoomLevelRef.current;
			}
		};

		const handleTouchMove = (event: TouchEvent) => {
			if (event.touches.length !== 2 || startDistanceRef.current === null) {
				return;
			}
			event.preventDefault();
			const distance = getDistance(event.touches);
			const ratio = distance / startDistanceRef.current;
			const nextZoom = Math.max(
				minZoom,
				Math.min(maxZoom, startZoomRef.current * ratio),
			);
			setZoomLevel(nextZoom);
		};

		const handleTouchEnd = (event: TouchEvent) => {
			if (event.touches.length < 2) {
				const wasPinching = startDistanceRef.current !== null;
				startDistanceRef.current = null;

				if (!wasPinching && event.touches.length === 0) {
					const now = Date.now();
					if (
						now - lastTapRef.current < 300 &&
						resetZoomRef.current !== undefined
					) {
						setZoomLevel(resetZoomRef.current);
						lastTapRef.current = 0;
					} else {
						lastTapRef.current = now;
					}
				}
			}
		};

		container.addEventListener("touchstart", handleTouchStart, {
			passive: true,
		});
		container.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});
		container.addEventListener("touchend", handleTouchEnd, { passive: true });
		container.addEventListener("touchcancel", handleTouchEnd, {
			passive: true,
		});

		return () => {
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
			container.removeEventListener("touchcancel", handleTouchEnd);
		};
	}, [containerRef, minZoom, maxZoom, setZoomLevel]);
}
