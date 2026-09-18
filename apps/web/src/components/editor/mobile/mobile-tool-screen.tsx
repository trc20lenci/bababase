"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useMobileToolScreenStore } from "@/stores/mobile-tool-screen-store";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Captions } from "@/components/editor/panels/assets/views/captions";
import { MediaView } from "@/components/editor/panels/assets/views/media";
import { SettingsView } from "@/components/editor/panels/assets/views/settings";
import { SoundsView } from "@/components/editor/panels/assets/views/sounds";
import { StickersView } from "@/components/editor/panels/assets/views/stickers";
import { TextView } from "@/components/editor/panels/assets/views/text";
import type { Tab } from "@/stores/assets-panel-store";

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

const TITLES: Record<Tab, string> = {
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

/**
 * Takes over the whole editor screen when a bottom-toolbar tool is open --
 * a real "screen" the user navigates into and back out of, not a sheet
 * floating over the editor.
 */
export function MobileToolScreen() {
	const { activeTool, closeTool } = useMobileToolScreenStore();

	if (!activeTool) return null;

	const title = activeTool === "properties" ? "Изменить" : TITLES[activeTool];

	return (
		<div className="bg-background absolute inset-0 z-40 flex flex-col">
			<header className="border-border/60 flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
				<button
					type="button"
					onClick={closeTool}
					aria-label="Назад"
					className="flex size-9 items-center justify-center"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
				</button>
				<h2 className="text-sm font-semibold">{title}</h2>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{activeTool === "properties" ? (
					<PropertiesPanel />
				) : (
					VIEW_MAP[activeTool]
				)}
			</div>
		</div>
	);
}
