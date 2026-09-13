"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	PlusSignIcon,
	Search01Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { OcVideoIcon } from "@opencut/ui/icons";
import { useEditor } from "@/hooks/use-editor";
import { MobileTabBar, MobileTabBarSpacer } from "@/components/mobile/mobile-tab-bar";
import { tabs, type Tab } from "@/stores/assets-panel-store";
import { DEFAULT_LOGO_URL } from "@/constants/site-constants";

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
		<div className="bg-background min-h-screen md:hidden">
			<header className="flex items-center justify-between px-4 pt-5 pb-3">
				<div className="flex items-center gap-2.5">
					<Image
						src={DEFAULT_LOGO_URL}
						alt="OpenCut"
						width={26}
						height={26}
						className="invert dark:invert-0"
					/>
					<span className="text-lg font-semibold">OpenCut</span>
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

				<div className="grid grid-cols-2 gap-3">
					<button
						type="button"
						onClick={handleCreateProject}
						className="from-primary/15 to-primary/5 border-primary/20 flex flex-col items-center justify-center gap-2 rounded-2xl border bg-gradient-to-b px-4 py-8 text-center active:scale-[0.98]"
					>
						<div className="bg-primary flex size-11 items-center justify-center rounded-full text-white">
							<HugeiconsIcon icon={PlusSignIcon} className="size-6" />
						</div>
						<span className="text-sm font-semibold">Новое видео</span>
					</button>
					<Link
						href="/projects"
						className="bg-accent/40 border-border/60 flex flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-8 text-center active:scale-[0.98]"
					>
						<div className="bg-secondary flex size-11 items-center justify-center rounded-full">
							<HugeiconsIcon icon={Video01Icon} className="size-6" />
						</div>
						<span className="text-sm font-semibold">Все проекты</span>
					</Link>
				</div>

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
									className="bg-accent/30 flex flex-col items-center gap-2 rounded-xl py-4 active:scale-[0.97]"
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

			<MobileTabBarSpacer />
			<MobileTabBar />
		</div>
	);
}

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
