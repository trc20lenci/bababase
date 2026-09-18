import { useState } from "react";
import type { ImageElement, VideoElement } from "@/types/timeline";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon, EraserIcon } from "@hugeicons/core-free-icons";
import { useMobileToolScreenStore } from "@/stores/mobile-tool-screen-store";
import {
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
	PropertyGroup,
} from "./property-item";
import { useEditor } from "@/hooks/use-editor";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import { useKeyframeActions } from "@/hooks/timeline/element/use-keyframe-actions";

export function VideoProperties({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement;
	trackId: string;
}) {
	const editor = useEditor();
	const [opacityInput, setOpacityInput] = useState(
		Math.round(element.opacity * 100).toString(),
	);
	const { isActive, setIsActive } = useKeyframeEditorStore();
	const { openTool } = useMobileToolScreenStore();
	const {
		keyframes,
		activeKeyframeId,
		addKeyframeAtPlayhead,
		selectKeyframe,
		deleteActiveKeyframe,
	} = useKeyframeActions({ element, trackId });

	const handleOpacityChange = (percent: number) => {
		setOpacityInput(percent.toString());
		editor.timeline.updateElementTransform({
			trackId,
			elementId: element.id,
			updates: { opacity: percent / 100 },
		});
	};

	return (
		<div className="space-y-4 p-5">
			<PropertyItem direction="column">
				<PropertyItemLabel>Opacity</PropertyItemLabel>
				<PropertyItemValue>
					<div className="flex items-center gap-2">
						<Slider
							value={[element.opacity * 100]}
							min={0}
							max={100}
							step={1}
							onValueChange={([value]) => handleOpacityChange(value)}
							className="w-full"
						/>
						<Input
							type="number"
							value={opacityInput}
							min={0}
							max={100}
							onChange={(e) => setOpacityInput(e.target.value)}
							onBlur={() => {
								const parsed = parseInt(opacityInput, 10);
								handleOpacityChange(
									Number.isNaN(parsed)
										? Math.round(element.opacity * 100)
										: Math.max(0, Math.min(100, parsed)),
								);
							}}
							className="w-16 shrink-0"
						/>
					</div>
				</PropertyItemValue>
			</PropertyItem>

			<Button
				type="button"
				variant="outline"
				className="w-full justify-start gap-2"
				onClick={() => openTool({ tool: "background-removal" })}
			>
				<HugeiconsIcon icon={EraserIcon} className="size-4" />
				Удалить фон
			</Button>

			<PropertyGroup title="Кейфреймы: зум и панорама">
				<div className="flex flex-col gap-3">
					<p className="text-muted-foreground text-xs text-balance">
						Включите редактирование, затем перетаскивайте/растягивайте
						превью, чтобы задать позицию и масштаб. Ставьте точки (◆) в
						разных местах таймлайна — между ними видео будет плавно
						приближаться и двигаться.
					</p>

					<Button
						type="button"
						size="sm"
						variant={isActive ? "default" : "outline"}
						onClick={() => setIsActive({ isActive: !isActive })}
					>
						{isActive ? "Готово" : "Включить редактирование"}
					</Button>

					{keyframes.length > 0 && (
						<div className="flex flex-col gap-1.5">
							{keyframes
								.slice()
								.sort((a, b) => a.time - b.time)
								.map((kf) => (
									<button
										key={kf.id}
										type="button"
										onClick={() => selectKeyframe(kf.id, kf.time)}
										className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs ${
											activeKeyframeId === kf.id
												? "border-primary text-primary"
												: "border-border text-muted-foreground"
										}`}
									>
										<span className="flex items-center gap-2">
											<span className="bg-primary block size-2 rotate-45" />
											{kf.time.toFixed(1)}с · {Math.round(kf.transform.scale * 100)}%
										</span>
									</button>
								))}
						</div>
					)}

					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="flex-1 gap-1.5"
							onClick={addKeyframeAtPlayhead}
						>
							<HugeiconsIcon icon={PlusSignIcon} className="size-4" />
							Добавить точку здесь
						</Button>
						{activeKeyframeId && (
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="text-destructive shrink-0"
								onClick={deleteActiveKeyframe}
								aria-label="Удалить точку"
							>
								<HugeiconsIcon icon={Delete02Icon} />
							</Button>
						)}
					</div>
				</div>
			</PropertyGroup>
		</div>
	);
}
