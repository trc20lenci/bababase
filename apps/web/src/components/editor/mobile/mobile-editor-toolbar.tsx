"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cursor02Icon,
	CheckmarkCircle02Icon,
	PlusSignIcon,
	Delete02Icon,
	ArrowLeft01Icon,
	ScissorIcon,
	VolumeHighIcon,
	VolumeMute02Icon,
	Copy01Icon,
	Settings05Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { tabs, type Tab } from "@/stores/assets-panel-store";
import { useMobileToolScreenStore } from "@/stores/mobile-tool-screen-store";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import { useKeyframeActions } from "@/hooks/timeline/element/use-keyframe-actions";
import { invokeAction } from "@/lib/actions/registry";
import { cn } from "@/utils/ui";
import type { ImageElement, VideoElement } from "@/types/timeline";

/** Bottom toolbar entries when nothing is selected — mapped onto the real
 * editing panels that already exist in the desktop editor. */
const TOOLBAR_ITEMS: { key: Tab; label: string }[] = [
	{ key: "media", label: "Медиа" },
	{ key: "sounds", label: "Звук" },
	{ key: "text", label: "Текст" },
	{ key: "stickers", label: "Наложение" },
	{ key: "effects", label: "Эффекты" },
	{ key: "captions", label: "Субтитры" },
];

function isTransformable(
	element: { type: string } | undefined,
): element is VideoElement | ImageElement {
	return element?.type === "video" || element?.type === "image";
}

function ContextButton({
	icon,
	label,
	onClick,
	destructive,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	destructive?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex shrink-0 flex-col items-center justify-center gap-1 px-3.5 py-2.5"
		>
			<span className={destructive ? "text-destructive" : ""}>{icon}</span>
			<span
				className={cn(
					"text-[0.65rem] leading-none font-medium whitespace-nowrap",
					destructive ? "text-destructive" : "text-foreground",
				)}
			>
				{label}
			</span>
		</button>
	);
}

export function MobileEditorToolbar() {
	const { activeTool, openTool, closeTool } = useMobileToolScreenStore();
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const hasSelection = selectedElements.length === 1;
	const { isActive, setIsActive } = useKeyframeEditorStore();

	// Leave whatever full-screen tool is open once keyframe editing starts
	// so the canvas underneath becomes reachable for pan/pinch gestures.
	useEffect(() => {
		if (isActive && activeTool) {
			closeTool();
		}
	}, [isActive, activeTool, closeTool]);

	const selection = selectedElements.length === 1 ? selectedElements[0] : null;
	const elementsWithTracks = selection
		? editor.timeline.getElementsWithTracks({ elements: [selection] })
		: [];
	const resolved = elementsWithTracks[0];
	const element = isTransformable(resolved?.element) ? resolved.element : null;

	// If the user deselects (or selects something non-visual) while editing
	// keyframes, fall back to the normal toolbar instead of leaving a
	// dangling gesture layer active for whatever gets selected next.
	useEffect(() => {
		if (isActive && !element) {
			setIsActive({ isActive: false });
		}
	}, [isActive, element, setIsActive]);

	const { keyframes, activeKeyframeId, addKeyframeAtPlayhead, deleteActiveKeyframe } =
		useKeyframeActions({
			element,
			trackId: resolved?.track.id ?? null,
		});

	if (isActive && element) {
		return (
			<div
				className="bg-background border-border/60 flex items-center gap-2 border-t px-3 py-2.5"
				style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)" }}
			>
				<span className="text-muted-foreground shrink-0 text-xs">
					Точек: {keyframes.length}
				</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="flex-1 gap-1.5"
					onClick={addKeyframeAtPlayhead}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-4" />
					Точка здесь
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
				<Button
					type="button"
					size="sm"
					className="shrink-0 gap-1.5"
					onClick={() => setIsActive({ isActive: false })}
				>
					<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
					Готово
				</Button>
			</div>
		);
	}

	// A clip is selected: show its actions right in place, in the same
	// toolbar row, instead of navigating anywhere. Matches the selected-
	// clip toolbar in CapCut (Split / Volume / Duplicate / Effects /
	// Delete), scrollable, with a back arrow to deselect.
	if (hasSelection && resolved) {
		const isMuted =
			(resolved.element.type === "video" || resolved.element.type === "audio") &&
			"muted" in resolved.element &&
			!!resolved.element.muted;

		return (
			<div
				className="bg-background border-border/60 flex items-stretch overflow-x-auto border-t"
				style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
			>
				<button
					type="button"
					onClick={() => editor.selection.setSelectedElements({ elements: [] })}
					aria-label="Снять выделение"
					className="text-muted-foreground flex shrink-0 items-center justify-center px-3"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
				</button>

				<ContextButton
					icon={<HugeiconsIcon icon={ScissorIcon} className="size-5" />}
					label="Разделить"
					onClick={() => invokeAction("split")}
				/>
				<ContextButton
					icon={
						<HugeiconsIcon
							icon={isMuted ? VolumeMute02Icon : VolumeHighIcon}
							className="size-5"
						/>
					}
					label="Громкость"
					onClick={() => invokeAction("toggle-elements-muted-selected")}
				/>
				<ContextButton
					icon={<HugeiconsIcon icon={Copy01Icon} className="size-5" />}
					label="Дублировать"
					onClick={() => invokeAction("duplicate-selected")}
				/>
				{(element?.type === "video" || element?.type === "image") && (
					<ContextButton
						icon={<tabs.effects.icon className="size-5" />}
						label="Эффекты"
						onClick={() => openTool({ tool: "effects" })}
					/>
				)}
				<ContextButton
					icon={<HugeiconsIcon icon={Settings05Icon} className="size-5" />}
					label="Ещё"
					onClick={() => openTool({ tool: "properties" })}
				/>
				<ContextButton
					icon={<HugeiconsIcon icon={Delete02Icon} className="size-5" />}
					label="Удалить"
					destructive
					onClick={() => invokeAction("delete-selected")}
				/>
			</div>
		);
	}

	return (
		<div
			className="bg-background border-border/60 flex items-stretch border-t"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<button
				type="button"
				onClick={() => openTool({ tool: "properties" })}
				className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
			>
				<HugeiconsIcon icon={Cursor02Icon} className="text-muted-foreground size-5" />
				<span className="text-muted-foreground text-[0.65rem] leading-none font-medium">
					Изменить
				</span>
			</button>

			{TOOLBAR_ITEMS.map((item) => {
				const tab = tabs[item.key];
				return (
					<button
						key={item.key}
						type="button"
						onClick={() => openTool({ tool: item.key })}
						className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
					>
						<tab.icon className="text-muted-foreground size-5" />
						<span className="text-muted-foreground text-[0.65rem] leading-none font-medium">
							{item.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
