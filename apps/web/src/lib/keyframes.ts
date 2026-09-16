import type { Transform, TransformKeyframe } from "@/types/timeline";

const DEFAULT_TRANSFORM: Transform = {
	scale: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpTransform(a: Transform, b: Transform, t: number): Transform {
	return {
		scale: lerp(a.scale, b.scale, t),
		position: {
			x: lerp(a.position.x, b.position.x, t),
			y: lerp(a.position.y, b.position.y, t),
		},
		rotate: lerp(a.rotate, b.rotate, t),
	};
}

/**
 * Resolves the transform that should be applied at `localTime` (seconds
 * since the element started on the timeline). Falls back to the element's
 * static `transform` when there are fewer than 2 keyframes -- with exactly
 * one keyframe, that keyframe's transform is held constant throughout.
 */
export function getTransformAtTime({
	transform,
	keyframes,
	localTime,
}: {
	transform: Transform;
	keyframes: TransformKeyframe[] | undefined;
	localTime: number;
}): Transform {
	if (!keyframes || keyframes.length === 0) {
		return transform ?? DEFAULT_TRANSFORM;
	}

	const sorted = [...keyframes].sort((a, b) => a.time - b.time);

	if (sorted.length === 1) {
		return sorted[0].transform;
	}

	if (localTime <= sorted[0].time) {
		return sorted[0].transform;
	}

	const last = sorted[sorted.length - 1];
	if (localTime >= last.time) {
		return last.transform;
	}

	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i];
		const b = sorted[i + 1];
		if (localTime >= a.time && localTime <= b.time) {
			const span = b.time - a.time;
			const t = span <= 0 ? 0 : (localTime - a.time) / span;
			return lerpTransform(a.transform, b.transform, t);
		}
	}

	return last.transform;
}

/** Finds the keyframe closest in time to `localTime`, if any exist. */
export function findNearestKeyframe({
	keyframes,
	localTime,
}: {
	keyframes: TransformKeyframe[] | undefined;
	localTime: number;
}): TransformKeyframe | null {
	if (!keyframes || keyframes.length === 0) return null;
	let nearest = keyframes[0];
	let nearestDist = Math.abs(keyframes[0].time - localTime);
	for (const kf of keyframes.slice(1)) {
		const dist = Math.abs(kf.time - localTime);
		if (dist < nearestDist) {
			nearest = kf;
			nearestDist = dist;
		}
	}
	return nearest;
}

/** Snap threshold (seconds) for treating the playhead as "on" a keyframe. */
export const KEYFRAME_SNAP_SECONDS = 0.15;
