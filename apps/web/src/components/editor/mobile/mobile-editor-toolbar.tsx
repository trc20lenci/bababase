"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cursor02Icon,
	Settings05Icon,
	CheckmarkCircle02Icon,
	PlusSignIcon,
	Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { tabs, type Tab } from "@/stores/assets-panel-store";
import { useMobileToolScreenStore } from "@/stores/mobile-tool-screen-store";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import { useKeyframeActions } from "@/hooks/timeline/element/use-keyframe-actions";
import { cn } from "@/utils/ui";
import type { ImageElement, VideoElement } from "@/types/timeline";

/** Bottom toolbar entries, mapped onto the real editing panels that already
 * exist in the desktop editor. Nothing here is a stub — every icon opens a
 * working tool. */
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

export function MobileEditorToolbar() {
	const { activeTool, openTool, closeTool } = useMobileToolScreenStore();
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const hasSelection = selectedElements.length > 0;
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
				<HugeiconsIcon
					icon={hasSelection ? Settings05Icon : Cursor02Icon}
					className={cn(
						"size-5",
						hasSelection ? "text-primary" : "text-muted-foreground",
					)}
				/>
				<span
					className={cn(
						"text-[0.65rem] leading-none font-medium",
						hasSelection ? "text-primary" : "text-muted-foreground",
					)}
				>
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
