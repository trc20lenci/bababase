"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { OcVideoIcon } from "@opencut/ui/icons";
import { useEditor } from "@/hooks/use-editor";
import { AppFrame } from "@/components/mobile/app-frame";
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar";
import { tabs, type Tab } from "@/stores/assets-panel-store";

/** Editing tools surfaced as quick shortcuts — these map 1:1 to the real
 * panels available inside the editor, so every tile here opens a working
 * feature rather than a placeholder. */
const QUICK_TOOLS: Tab[] = [
	"media",
	"sounds",
	"text",
	"stickers",
	"captions",
	"effects",
	"transitions",
	"filters",
	"adjustment",
];

const TOOL_LABELS: Record<Tab, string> = {
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

export default function StudioPage() {
	const editor = useEditor();
	const router = useRouter();

	useEffect(() => {
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	const recentProjects = editor.project
		.getFilteredAndSortedProjects({
			searchQuery: "",
			sortOption: "updatedAt-desc",
		})
		.slice(0, 8);

	const handleCreateProject = async () => {
		try {
			const projectId = await editor.project.createNewProject({
				name: "New project",
			});
			router.push(`/editor/${projectId}`);
		} catch (error) {
			toast.error("Не удалось создать проект", {
				description:
					error instanceof Error ? error.message : "Попробуйте снова",
			});
		}
	};

	return (
		<AppFrame>
			<div className="from-primary/25 via-primary/5 flex-1 overflow-y-auto bg-gradient-to-b to-transparent">
				<header className="flex items-center justify-between px-4 pt-6 pb-4">
					<div className="flex items-center gap-2">
						<div className="bg-primary flex size-7 items-center justify-center rounded-lg text-sm font-black text-white">
							B
						</div>
						<span className="text-lg font-bold tracking-tight">BASE</span>
					</div>
					<Link
						href="/projects"
						aria-label="Поиск проектов"
						className="text-muted-foreground"
					>
						<HugeiconsIcon icon={Search01Icon} className="size-5" />
					</Link>
				</header>

				<main className="flex flex-col gap-6 px-4 pb-6">
					<div>
						<p className="text-muted-foreground text-sm">
							Нужно новое видео?
						</p>
						<h1 className="text-xl font-semibold">Создайте проект</h1>
					</div>

					<button
						type="button"
						onClick={handleCreateProject}
						className="bg-primary flex items-center justify-center gap-2 rounded-2xl py-4 text-center font-semibold text-white shadow-lg shadow-primary/20 active:scale-[0.98]"
					>
						<HugeiconsIcon icon={PlusSignIcon} className="size-5" />
						Новое видео
					</button>

					<section className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-medium">Недавние</h2>
							{recentProjects.length > 0 && (
								<Link
									href="/projects"
									className="text-primary text-xs font-medium"
								>
									Все
								</Link>
							)}
						</div>

						{recentProjects.length === 0 ? (
							<p className="text-muted-foreground py-6 text-center text-sm">
								Проектов пока нет — создайте первый
							</p>
						) : (
							<div className="scrollbar-hidden -mx-4 flex gap-3 overflow-x-auto px-4">
								{recentProjects.map((project) => (
									<Link
										key={project.id}
										href={`/editor/${project.id}`}
										className="flex w-28 shrink-0 flex-col gap-1.5"
									>
										<div className="bg-muted relative aspect-[9/16] w-28 overflow-hidden rounded-xl">
											{project.thumbnail ? (
												<Image
													src={project.thumbnail}
													alt={project.name}
													fill
													className="object-cover"
												/>
											) : (
												<div className="flex size-full items-center justify-center">
													<OcVideoIcon className="text-muted-foreground size-8" />
												</div>
											)}
										</div>
										<span className="truncate text-xs font-medium">
											{project.name}
										</span>
									</Link>
								))}
							</div>
						)}
					</section>

					<section className="flex flex-col gap-3">
						<h2 className="text-sm font-medium">Инструменты редактора</h2>
						<div className="grid grid-cols-3 gap-3">
							{QUICK_TOOLS.map((toolKey) => {
								const tool = tabs[toolKey];
								return (
									<button
										key={toolKey}
										type="button"
										onClick={handleCreateProject}
										className="bg-accent/40 flex flex-col items-center gap-2 rounded-xl py-4 active:scale-[0.97]"
									>
										<tool.icon className="text-foreground size-5" />
										<span className="text-muted-foreground text-[0.7rem]">
											{TOOL_LABELS[toolKey]}
										</span>
									</button>
								);
							})}
						</div>
					</section>
				</main>
			</div>

			<MobileTabBar />
		</AppFrame>
	);
}
