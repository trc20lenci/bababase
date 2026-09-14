"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	Folder03Icon,
	GithubIcon,
	InformationCircleIcon,
	Moon02Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { FaDiscord } from "react-icons/fa6";
import { useEditor } from "@/hooks/use-editor";
import { AppFrame } from "@/components/mobile/app-frame";
import { MobileTabBar } from "@/components/mobile/mobile-tab-bar";
import { SOCIAL_LINKS } from "@/constants/site-constants";
import { formatTimeCode } from "@/lib/time";

export default function ProfilePage() {
	const editor = useEditor();
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	const projects = editor.project.getSavedProjects();
	const totalDuration = projects.reduce(
		(sum, project) => sum + (project.duration ?? 0),
		0,
	);
	const totalDurationLabel =
		totalDuration > 0
			? formatTimeCode({
					timeInSeconds: totalDuration,
					format: totalDuration >= 3600 ? "HH:MM:SS" : "MM:SS",
				})
			: "0:00";

	return (
		<AppFrame>
			<div className="from-primary/25 via-primary/5 flex-1 overflow-y-auto bg-gradient-to-b to-transparent">
				<header className="flex items-center justify-between px-4 pt-6 pb-4">
					<h1 className="text-xl font-semibold">Профиль</h1>
				</header>

				<main className="flex flex-col gap-6 px-4 pb-6">
					<div className="flex items-center gap-3">
						<div className="bg-primary flex size-14 items-center justify-center rounded-full text-xl font-black text-white">
							B
						</div>
						<div>
							<p className="text-base font-semibold">Локальный профиль</p>
							<p className="text-muted-foreground text-sm">
								Все проекты хранятся в этом браузере
							</p>
						</div>
					</div>

					<div className="from-primary/20 to-primary/5 border-primary/20 flex items-center justify-around rounded-2xl border bg-gradient-to-br px-4 py-5">
						<Stat label="Проекты" value={String(projects.length)} />
						<div className="bg-border/60 h-8 w-px" />
						<Stat label="Общая длительность" value={totalDurationLabel} />
					</div>

					<section className="bg-card flex flex-col overflow-hidden rounded-2xl border">
						<MenuLink href="/projects" icon={Folder03Icon} label="Мои проекты" />
						<MenuLink href="/studio" icon={Video01Icon} label="Новый проект" />
						<MenuButton
							icon={Moon02Icon}
							label="Тёмная тема"
							active={theme === "dark"}
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						/>
					</section>

					<section className="bg-card flex flex-col overflow-hidden rounded-2xl border">
						<MenuLink
							href={SOCIAL_LINKS.github}
							icon={GithubIcon}
							label="Исходный код на GitHub"
							external
						/>
						<MenuLink
							href={SOCIAL_LINKS.discord}
							customIcon={<FaDiscord className="text-muted-foreground size-5" />}
							label="Сообщество в Discord"
							external
						/>
						<MenuLink
							href="/studio"
							icon={InformationCircleIcon}
							label="О приложении"
						/>
					</section>

					<p className="text-muted-foreground px-1 text-center text-xs">
						BASE — мобильный видеоредактор в браузере
					</p>
				</main>
			</div>

			<MobileTabBar />
		</AppFrame>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col items-center gap-0.5">
			<span className="text-lg font-semibold">{value}</span>
			<span className="text-muted-foreground text-xs">{label}</span>
		</div>
	);
}

function MenuLink({
	href,
	icon,
	customIcon,
	label,
	external,
}: {
	href: string;
	icon?: IconSvgElement;
	customIcon?: React.ReactNode;
	label: string;
	external?: boolean;
}) {
	return (
		<Link
			href={href}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
			className="border-border/60 flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0 active:bg-accent/30"
		>
			{customIcon ??
				(icon && (
					<HugeiconsIcon icon={icon} className="text-muted-foreground size-5" />
				))}
			<span className="text-sm font-medium">{label}</span>
		</Link>
	);
}

function MenuButton({
	icon,
	label,
	active,
	onClick,
}: {
	icon: IconSvgElement;
	label: string;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-3 px-4 py-3.5 text-left active:bg-accent/30"
		>
			<HugeiconsIcon icon={icon} className="text-muted-foreground size-5" />
			<span className="flex-1 text-sm font-medium">{label}</span>
			<span
				className={`h-5 w-9 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"} relative`}
			>
				<span
					className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${active ? "left-4.5" : "left-0.5"}`}
				/>
			</span>
		</button>
	);
}
