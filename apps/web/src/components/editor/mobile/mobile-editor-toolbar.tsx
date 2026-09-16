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
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { tabs, type Tab } from "@/stores/assets-panel-store";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { useKeyframeEditorStore } from "@/stores/keyframe-editor-store";
import { useKeyframeActions } from "@/hooks/timeline/element/use-keyframe-actions";
import { cn } from "@/utils/ui";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Captions } from "@/components/editor/panels/assets/views/captions";
import { MediaView } from "@/components/editor/panels/assets/views/media";
import { SettingsView } from "@/components/editor/panels/assets/views/settings";
import { SoundsView } from "@/components/editor/panels/assets/views/sounds";
import { StickersView } from "@/components/editor/panels/assets/views/stickers";
import { TextView } from "@/components/editor/panels/assets/views/text";
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

const VIEW_MAP: Record<Tab, React.ReactNode> = {
	media: <MediaView />,
	sounds: <SoundsView />,
	text: <TextView />,
	stickers: <StickersView />,
	effects: (
		<div className="text-muted-foreground p-6 text-center text-sm">
			Эффекты — скоро
		</div>
	),
	transitions: (
		<div className="text-muted-foreground p-6 text-center text-sm">
			Переходы — скоро
		</div>
	),
	captions: <Captions />,
	filters: (
		<div className="text-muted-foreground p-6 text-center text-sm">
			Фильтры — скоро
		</div>
	),
	adjustment: (
		<div className="text-muted-foreground p-6 text-center text-sm">
			Коррекция — скоро
		</div>
	),
	settings: <SettingsView />,
};

const TAB_TITLES: Record<Tab, string> = {
	media: "Медиа",
	sounds: "Звук",
	text: "Текст",
	stickers: "Наложение",
	effects: "Эффекты",
	transitions: "Переходы",
	captions: "Субтитры",
	filters: "Фильтры",
	adjustment: "Коррекция",
	settings: "Настройки",
};

function isTransformable(
	element: { type: string } | undefined,
): element is VideoElement | ImageElement {
	return element?.type === "video" || element?.type === "image";
}

export function MobileEditorToolbar() {
	const [openSheet, setOpenSheet] = useState<"properties" | Tab | null>(null);
	const editor = useEditor();
	const { selectedElements } = useElementSelection();
	const hasSelection = selectedElements.length > 0;
	const { isActive, setIsActive } = useKeyframeEditorStore();

	// Close the properties sheet once keyframe editing starts so the canvas
	// underneath becomes reachable for pan/pinch gestures.
	useEffect(() => {
		if (isActive) {
			setOpenSheet(null);
		}
	}, [isActive]);

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
		<>
			<div
				className="bg-background border-border/60 flex items-stretch border-t"
				style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
			>
				<button
					type="button"
					onClick={() => setOpenSheet("properties")}
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
							onClick={() => setOpenSheet(item.key)}
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

			<Drawer
				open={openSheet !== null}
				onOpenChange={(open) => !open && setOpenSheet(null)}
			>
				<DrawerContent className="max-h-[75vh]">
					<DrawerTitle className="px-4 pt-1 pb-2 text-base">
						{openSheet === "properties"
							? "Изменить"
							: openSheet
								? TAB_TITLES[openSheet]
								: ""}
					</DrawerTitle>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{openSheet === "properties" ? (
							<PropertiesPanel />
						) : openSheet ? (
							VIEW_MAP[openSheet]
						) : null}
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
