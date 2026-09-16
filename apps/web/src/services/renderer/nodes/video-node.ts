import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import { videoCache } from "@/services/video-cache/service";
import type { Transform, TransformKeyframe } from "@/types/timeline";
import { getTransformAtTime } from "@/lib/keyframes";

const VIDEO_EPSILON = 1 / 1000;

export interface BaseMediaNodeParams {
	file: File;
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	transform?: Transform;
	keyframes?: TransformKeyframe[];
	opacity?: number;
}

export interface VideoNodeParams extends BaseMediaNodeParams {
	mediaId: string;
}

export class VideoNode extends BaseNode<VideoNodeParams> {
	private getVideoTime(time: number) {
		return time - this.params.timeOffset + this.params.trimStart;
	}

	private isInRange(time: number) {
		const videoTime = this.getVideoTime(time);
		return (
			videoTime >= this.params.trimStart - VIDEO_EPSILON &&
			videoTime < this.params.trimStart + this.params.duration
		);
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange(time)) {
			return;
		}

		const videoTime = this.getVideoTime(time);
		const frame = await videoCache.getFrameAt({
			mediaId: this.params.mediaId,
			file: this.params.file,
			time: videoTime,
		});

		if (frame) {
			renderer.context.save();

			if (this.params.opacity !== undefined) {
				renderer.context.globalAlpha = this.params.opacity;
			}

			const localTime = time - this.params.timeOffset;
			const transform = getTransformAtTime({
				transform: this.params.transform ?? {
					scale: 1,
					position: { x: 0, y: 0 },
					rotate: 0,
				},
				keyframes: this.params.keyframes,
				localTime,
			});

			const width = renderer.width * transform.scale;
			const height = renderer.height * transform.scale;
			const x = renderer.width / 2 + transform.position.x - width / 2;
			const y = renderer.height / 2 + transform.position.y - height / 2;

			if (transform.rotate !== 0) {
				const centerX = x + width / 2;
				const centerY = y + height / 2;
				renderer.context.translate(centerX, centerY);
				renderer.context.rotate((transform.rotate * Math.PI) / 180);
				renderer.context.translate(-centerX, -centerY);
			}

			renderer.context.drawImage(frame.canvas, x, y, width, height);

			renderer.context.restore();
		}
	}
}
