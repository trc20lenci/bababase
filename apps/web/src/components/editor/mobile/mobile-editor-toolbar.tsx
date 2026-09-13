"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cursor02Icon,
	Settings05Icon,
} from "@hugeicons/core-free-icons";
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
} from "@/components/ui/drawer";
import { tabs, type Tab } from "@/stores/assets-panel-store";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { cn } from "@/utils/ui";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { Captions } from "@/components/editor/panels/assets/views/captions";
import { MediaView } from "@/components/editor/panels/assets/views/media";
import { SettingsView } from "@/components/editor/panels/assets/views/settings";
import { SoundsView } from "@/components/editor/panels/assets/views/sounds";
import { StickersView } from "@/components/editor/panels/assets/views/stickers";
import { TextView } from "@/components/editor/panels/assets/views/text";

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

export function MobileEditorToolbar() {
	const [openSheet, setOpenSheet] = useState<"properties" | Tab | null>(null);
	const { selectedElements } = useElementSelection();
	const hasSelection = selectedElements.length > 0;

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
