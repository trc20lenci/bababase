import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import type { BaseMediaNodeParams } from "./video-node";
import { getTransformAtTime } from "@/lib/keyframes";

const IMAGE_EPSILON = 1 / 1000;

export type ImageNodeParams = BaseMediaNodeParams;

export class ImageNode extends BaseNode<ImageNodeParams> {
	private image?: HTMLImageElement;
	private readyPromise: Promise<void>;

	constructor(params: ImageNodeParams) {
		super(params);
		this.readyPromise = this.load();
	}

	private async load() {
		const image = new Image();
		this.image = image;
		const url = URL.createObjectURL(this.params.file);

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Image load failed"));
			image.src = url;
		});

		URL.revokeObjectURL(url);
	}

	private getImageTime(time: number) {
		return time - this.params.timeOffset + this.params.trimStart;
	}

	private isInRange(time: number) {
		const imageTime = this.getImageTime(time);
		return (
			imageTime >= this.params.trimStart - IMAGE_EPSILON &&
			imageTime < this.params.trimStart + this.params.duration
		);
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange(time)) {
			return;
		}

		await this.readyPromise;

		if (!this.image) {
			return;
		}

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

		const mediaW = this.image.naturalWidth || renderer.width;
		const mediaH = this.image.naturalHeight || renderer.height;
		// "cover" base size so the image fills the frame edge-to-edge at
		// scale=1, matching how video clips fill the frame by default.
		const coverScale = Math.max(renderer.width / mediaW, renderer.height / mediaH);
		const baseW = mediaW * coverScale;
		const baseH = mediaH * coverScale;

		const width = baseW * transform.scale;
		const height = baseH * transform.scale;
		const x = renderer.width / 2 + transform.position.x - width / 2;
		const y = renderer.height / 2 + transform.position.y - height / 2;

		if (transform.rotate !== 0) {
			const centerX = x + width / 2;
			const centerY = y + height / 2;
			renderer.context.translate(centerX, centerY);
			renderer.context.rotate((transform.rotate * Math.PI) / 180);
			renderer.context.translate(-centerX, -centerY);
		}

		renderer.context.drawImage(this.image, x, y, width, height);

		renderer.context.restore();
	}
}
