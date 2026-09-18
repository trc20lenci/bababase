"use client";

import type { ImageElement, VideoElement } from "@/types/timeline";
import { useKeyframeActions } from "@/hooks/timeline/element/use-keyframe-actions";
import { cn } from "@/utils/ui";

/**
 * Diamond markers on the selected clip's timeline block, one per keyframe,
 * positioned by time. Tapping one selects it and seeks the playhead there
 * -- mirrors the list in the "Изменить" properties panel, just visible
 * directly on the strip.
 */
export function KeyframeMarkers({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement;
	trackId: string;
}) {
	const { keyframes, activeKeyframeId, selectKeyframe } = useKeyframeActions({
		element,
		trackId,
	});

	if (keyframes.length === 0) return null;

	return (
		<div className="pointer-events-none absolute inset-x-0 bottom-0.5 z-40 h-3">
			{keyframes.map((kf) => {
				const percent =
					element.duration > 0
						? Math.min(100, Math.max(0, (kf.time / element.duration) * 100))
						: 0;
				const isActive = activeKeyframeId === kf.id;

				return (
					<button
						key={kf.id}
						type="button"
						aria-label={`Точка на ${kf.time.toFixed(1)}с`}
						className="pointer-events-auto absolute top-1/2 flex size-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
						style={{ left: `${percent}%` }}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => {
							e.stopPropagation();
							selectKeyframe(kf.id, kf.time);
						}}
					>
						<span
							className={cn(
								"block size-2 rotate-45 border",
								isActive
									? "bg-primary border-primary-foreground"
									: "border-primary-foreground/70 bg-background",
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
