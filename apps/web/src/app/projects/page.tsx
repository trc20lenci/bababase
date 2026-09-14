"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MigrationDialog } from "@/components/editor/dialogs/migration-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor } from "@/hooks/use-editor";
import { useProjectsStore } from "./store";
import type {
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
} from "@/types/project";
import { formatTimeCode } from "@/lib/time";
import { formatDate } from "@/utils/date";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	PlusSignIcon,
	Search01Icon,
	Video01Icon,
	MoreHorizontalIcon,
	Delete02Icon,
	Copy01Icon,
	Edit03Icon,
	ArrowDown02Icon,
	InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { OcVideoIcon } from "@opencut/ui/icons";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectDialog } from "@/components/editor/dialogs/delete-project-dialog";
import { ProjectInfoDialog } from "@/components/editor/dialogs/project-info-dialog";
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog";
import { AppFrame } from "@/components/mobile/app-frame";
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar";

const formatProjectDuration = ({
	duration,
}: {
	duration: number | undefined;
}): string | null => {
	if (duration === undefined) {
		return null;
	}

	const format = duration >= 3600 ? "HH:MM:SS" : "MM:SS";
	return formatTimeCode({ timeInSeconds: duration, format });
};

export default function ProjectsPage() {
	const { searchQuery, sortKey, sortOrder } = useProjectsStore();
	const editor = useEditor();

	useEffect(() => {
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	const sortOption: TProjectSortOption = `${sortKey}-${sortOrder}`;
	const projectsToDisplay = editor.project.getFilteredAndSortedProjects({
		searchQuery,
		sortOption,
	});

	const isLoading = editor.project.getIsLoading();
	const isInitialized = editor.project.getIsInitialized();

	return (
		<AppFrame>
			<MigrationDialog />
			<div className="flex-1 overflow-y-auto">
				<ProjectsHeader count={projectsToDisplay.length} />
				<ProjectsToolbar projectIds={projectsToDisplay.map((p) => p.id)} />
				<main className="flex flex-col gap-4 pb-6">
					{isLoading || !isInitialized ? (
						<ProjectsSkeleton />
					) : projectsToDisplay.length === 0 ? (
						<EmptyState />
					) : (
						<div className="flex flex-col">
							{projectsToDisplay.map((project) => (
								<ProjectItem
									key={project.id}
									project={project}
									allProjectIds={projectsToDisplay.map((p) => p.id)}
								/>
							))}
						</div>
					)}
				</main>
			</div>
			<MobileTabBar />
		</AppFrame>
	);
}

function ProjectsHeader({ count }: { count: number }) {
	return (
		<header className="bg-background sticky top-0 z-20 flex flex-col gap-3 px-4 pt-6 pb-3">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Проекты</h1>
					{count > 0 && (
						<p className="text-muted-foreground text-xs">
							{count} {count === 1 ? "проект" : "проектов"}
						</p>
					)}
				</div>
				<NewProjectButton />
			</div>
			<SearchBar />
		</header>
	);
}

const SORT_LABELS: Record<TProjectSortKey, string> = {
	createdAt: "Создан",
	updatedAt: "Изменён",
	name: "Имя",
	duration: "Длительность",
};

function ProjectsToolbar({ projectIds }: { projectIds: string[] }) {
	const {
		selectedProjectIds,
		isSelectMode,
		sortKey,
		sortOrder,
		setSortOrder,
		setIsSelectMode,
	} = useProjectsStore();

	const selectedProjectCount = selectedProjectIds.length;

	return (
		<div className="flex items-center justify-between px-4 pb-1">
			<div className="flex items-center gap-1">
				<SortDropdown>
					<Button
						variant="text"
						className="text-muted-foreground px-1.5 text-sm"
					>
						{SORT_LABELS[sortKey]}
					</Button>
				</SortDropdown>
				<Button
					type="button"
					variant="text"
					className="text-muted-foreground px-1.5"
					onClick={() =>
						setSortOrder({
							sortOrder: sortOrder === "asc" ? "desc" : "asc",
						})
					}
					aria-label={`Сортировка ${sortOrder === "asc" ? "по возрастанию" : "по убыванию"}`}
				>
					<HugeiconsIcon
						icon={ArrowDown02Icon}
						className={sortOrder === "asc" ? "rotate-180" : ""}
					/>
				</Button>
			</div>

			{projectIds.length > 0 &&
				(isSelectMode ? (
					selectedProjectCount > 0 ? (
						<ProjectActions />
					) : (
						<Button
							variant="text"
							className="text-muted-foreground px-1.5 text-sm"
							onClick={() => setIsSelectMode({ isSelectMode: false })}
						>
							Отмена
						</Button>
					)
				) : (
					<Button
						variant="text"
						className="text-muted-foreground px-1.5 text-sm"
						onClick={() => setIsSelectMode({ isSelectMode: true })}
					>
						Выбрать
					</Button>
				))}
		</div>
	);
}

function SearchBar() {
	const { searchQuery, setSearchQuery } = useProjectsStore();

	return (
		<div className="relative">
			<HugeiconsIcon
				icon={Search01Icon}
				className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
				aria-hidden="true"
			/>
			<Input
				placeholder="Поиск проектов"
				value={searchQuery}
				onChange={(event) => setSearchQuery({ query: event.target.value })}
				className="pl-9"
			/>
		</div>
	);
}

const PROJECT_ACTIONS = [
	{
		id: "duplicate",
		label: "Дублировать",
		icon: Copy01Icon,
		variant: "outline" as const,
	},
	{
		id: "delete",
		label: "Удалить",
		icon: Delete02Icon,
		variant: "destructive-foreground" as const,
	},
] as const;

async function deleteProjects({
	editor,
	ids,
}: {
	editor: ReturnType<typeof useEditor>;
	ids: string[];
}) {
	await editor.project.deleteProjects({ ids });
}

async function duplicateProjects({
	editor,
	ids,
}: {
	editor: ReturnType<typeof useEditor>;
	ids: string[];
}) {
	await editor.project.duplicateProjects({ ids });
}

async function renameProject({
	editor,
	id,
	name,
}: {
	editor: ReturnType<typeof useEditor>;
	id: string;
	name: string;
}) {
	await editor.project.renameProject({ id, name });
}

function ProjectActions() {
	const editor = useEditor();
	const { selectedProjectIds, setIsSelectMode } = useProjectsStore();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const savedProjects = editor.project.getSavedProjects();
	const selectedProjectNames = savedProjects
		.filter((project) => selectedProjectIds.includes(project.id))
		.map((project) => project.name);

	const exitSelectMode = () => setIsSelectMode({ isSelectMode: false });

	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: selectedProjectIds });
		exitSelectMode();
	};

	const handleDeleteClick = () => {
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: selectedProjectIds });
		exitSelectMode();
		setIsDeleteDialogOpen(false);
	};

	const actionHandlers: Record<string, () => void> = {
		duplicate: handleDuplicate,
		delete: handleDeleteClick,
	};

	return (
		<>
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="outline" className="size-8">
							<HugeiconsIcon icon={MoreHorizontalIcon} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{PROJECT_ACTIONS.map((action) => (
							<DropdownMenuItem
								key={action.id}
								variant={action.id === "delete" ? "destructive" : undefined}
								onClick={actionHandlers[action.id]}
							>
								<HugeiconsIcon icon={action.icon} />
								{action.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					variant="text"
					className="text-muted-foreground px-1.5 text-sm"
					onClick={exitSelectMode}
				>
					Отмена
				</Button>
			</div>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={selectedProjectNames}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
}

function SortDropdown({ children }: { children: React.ReactNode }) {
	const { sortKey, setSortKey } = useProjectsStore();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48" align="start">
				<DropdownMenuCheckboxItem
					checked={sortKey === "createdAt"}
					onCheckedChange={() => setSortKey({ sortKey: "createdAt" })}
				>
					Создан
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "updatedAt"}
					onCheckedChange={() => setSortKey({ sortKey: "updatedAt" })}
				>
					Изменён
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "name"}
					onCheckedChange={() => setSortKey({ sortKey: "name" })}
				>
					Имя
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "duration"}
					onCheckedChange={() => setSortKey({ sortKey: "duration" })}
				>
					Длительность
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NewProjectButton() {
	const editor = useEditor();
	const router = useRouter();

	const handleCreateProject = async () => {
		const projectId = await editor.project.createNewProject({
			name: "New project",
		});
		router.push(`/editor/${projectId}`);
	};

	return (
		<Button size="icon" className="size-9 rounded-full" onClick={handleCreateProject}>
			<HugeiconsIcon icon={PlusSignIcon} />
		</Button>
	);
}

function ProjectItem({
	project,
	allProjectIds,
}: {
	project: TProjectMetadata;
	allProjectIds: string[];
}) {
	const {
		selectedProjectIds,
		isSelectMode,
		setProjectSelected,
		selectProjectRange,
	} = useProjectsStore();
	const selectedProjectIdSet = new Set(selectedProjectIds);
	const isSelected = selectedProjectIdSet.has(project.id);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const durationLabel = formatProjectDuration({ duration: project.duration });

	const handleCheckboxChange = ({
		checked,
		shiftKey,
	}: {
		checked: boolean;
		shiftKey: boolean;
	}) => {
		if (shiftKey && checked) {
			selectProjectRange({ projectId: project.id, allProjectIds });
			return;
		}
		setProjectSelected({ projectId: project.id, isSelected: checked });
	};

	const listRowContent = (
		<div className="flex min-w-0 flex-1 items-center gap-3">
			<div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl">
				{project.thumbnail ? (
					<Image
						src={project.thumbnail}
						alt="Project thumbnail"
						fill
						className="object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center">
						<OcVideoIcon className="text-muted-foreground size-6 shrink-0" />
					</div>
				)}
				{durationLabel && (
					<div className="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1 text-[0.62rem] font-medium text-white">
						{durationLabel}
					</div>
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h3 className="truncate text-sm font-medium">{project.name}</h3>
				<span className="text-muted-foreground text-xs">
					{formatDate({ date: project.createdAt })}
				</span>
			</div>
		</div>
	);

	return (
		<div
			className={`flex items-center gap-3 border-b px-4 py-3 ${
				isSelected ? "bg-primary/5" : ""
			}`}
		>
			{isSelectMode && (
				<Checkbox
					checked={isSelected}
					onMouseDown={(event) => event.preventDefault()}
					onClick={(event) => {
						handleCheckboxChange({
							checked: !isSelected,
							shiftKey: event.shiftKey,
						});
					}}
					onCheckedChange={() => {}}
					className="size-5 shrink-0"
				/>
			)}

			<Link
				href={isSelectMode ? "#" : `/editor/${project.id}`}
				onClick={(event) => {
					if (isSelectMode) {
						event.preventDefault();
						handleCheckboxChange({ checked: !isSelected, shiftKey: false });
					}
				}}
				className="min-w-0 flex-1"
			>
				{listRowContent}
			</Link>

			{!isSelectMode && (
				<ProjectMenu
					isOpen={isDropdownOpen}
					onOpenChange={setIsDropdownOpen}
					project={project}
				/>
			)}
		</div>
	);
}

function ProjectMenu({
	isOpen,
	onOpenChange,
	project,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	project: TProjectMetadata;
}) {
	const editor = useEditor();
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

	const handleMenuClick = ({
		event,
	}: {
		event: MouseEvent<HTMLButtonElement>;
	}) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const handleMenuKeyDown = ({
		event,
	}: {
		event: KeyboardEvent<HTMLButtonElement>;
	}) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	};

	const handleRename = () => {
		setIsRenameDialogOpen(true);
		onOpenChange(false);
	};

	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: [project.id] });
		onOpenChange(false);
	};

	const handleDeleteClick = () => {
		setIsDeleteDialogOpen(true);
		onOpenChange(false);
	};

	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: [project.id] });
		setIsDeleteDialogOpen(false);
	};

	const handleInfoClick = () => {
		setIsInfoDialogOpen(true);
		onOpenChange(false);
	};

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="background"
						className="!bg-transparent !shadow-none"
						size="icon"
						aria-label="Project menu"
						onClick={(event) =>
							handleMenuClick({
								event: event as unknown as MouseEvent<HTMLButtonElement>,
							})
						}
						onMouseDown={(event) => event.stopPropagation()}
						onKeyDown={(event) =>
							handleMenuKeyDown({
								event: event as unknown as KeyboardEvent<HTMLButtonElement>,
							})
						}
					>
						<HugeiconsIcon
							icon={MoreHorizontalIcon}
							className="text-foreground"
							aria-hidden="true"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-48" align="end">
					<DropdownMenuItem onClick={handleRename}>
						<HugeiconsIcon icon={Edit03Icon} />
						Переименовать
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDuplicate}>
						<HugeiconsIcon icon={Copy01Icon} />
						Дублировать
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleInfoClick}>
						<HugeiconsIcon icon={InformationCircleIcon} />
						Инфо
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
						<HugeiconsIcon icon={Delete02Icon} />
						Удалить
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<RenameProjectDialog
				isOpen={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
				projectName={project.name}
				onConfirm={async (newName) => {
					await renameProject({ editor, id: project.id, name: newName });
					setIsRenameDialogOpen(false);
				}}
			/>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={[project.name]}
				onConfirm={handleDeleteConfirm}
			/>

			<ProjectInfoDialog
				isOpen={isInfoDialogOpen}
				onOpenChange={setIsInfoDialogOpen}
				project={project}
			/>
		</>
	);
}

function ProjectsSkeleton() {
	const skeletonIds = Array.from(
		{ length: 8 },
		(_, index) => `skeleton-${index}`,
	);

	return (
		<div className="flex flex-col">
			{skeletonIds.map((skeletonId) => (
				<div
					key={skeletonId}
					className="flex items-center gap-3 border-b px-4 py-3"
				>
					<Skeleton className="bg-muted/50 size-16 shrink-0 rounded-xl" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="bg-muted/50 h-4 w-2/3" />
						<Skeleton className="bg-muted/50 h-3 w-1/3" />
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyState() {
	const { searchQuery, setSearchQuery } = useProjectsStore();
	const router = useRouter();
	const editor = useEditor();
	const savedProjects = editor.project.getSavedProjects();

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

	if (savedProjects.length > 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-5 px-4 py-16 text-center">
				<div className="flex flex-col items-center gap-8">
					<HugeiconsIcon
						icon={Search01Icon}
						className="text-muted-foreground bg-accent/35 size-16 rounded-md border p-4"
					/>
					<div className="flex flex-col items-center gap-3">
						<h3 className="text-lg font-medium">Ничего не найдено</h3>
						<p className="text-muted-foreground max-w-md">
							По запросу «{searchQuery}» ничего не нашлось.
						</p>
					</div>
				</div>
				<Button
					onClick={() => setSearchQuery({ query: "" })}
					variant="outline"
					size="lg"
				>
					Очистить поиск
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
			<div className="flex flex-col items-center gap-2">
				<div className="bg-muted/30 flex size-16 items-center justify-center rounded-full">
					<HugeiconsIcon
						icon={Video01Icon}
						className="text-muted-foreground size-8"
					/>
				</div>
				<h3 className="text-lg font-medium">Проектов пока нет</h3>
				<p className="text-muted-foreground max-w-md">
					Создайте первый проект — импортируйте медиа, монтируйте и
					экспортируйте видео. Всё приватно, на вашем устройстве.
				</p>
			</div>
			<Button size="lg" className="gap-2" onClick={handleCreateProject}>
				<HugeiconsIcon icon={PlusSignIcon} />
				Создать первый проект
			</Button>
		</div>
	);
}
