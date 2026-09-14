"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Edit02Icon,
	Folder03Icon,
	UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/utils/ui";

interface TabItem {
	href: string;
	label: string;
	icon: IconSvgElement;
	match: (pathname: string) => boolean;
}

const TABS: TabItem[] = [
	{
		href: "/studio",
		label: "Изменить",
		icon: Edit02Icon,
		match: (pathname) => pathname === "/studio",
	},
	{
		href: "/projects",
		label: "Проекты",
		icon: Folder03Icon,
		match: (pathname) => pathname.startsWith("/projects"),
	},
	{
		href: "/profile",
		label: "Я",
		icon: UserCircleIcon,
		match: (pathname) => pathname.startsWith("/profile"),
	},
];

export function MobileTabBar() {
	const pathname = usePathname();

	return (
		<nav
			className="bg-background border-border/60 flex shrink-0 items-stretch border-t"
			style={{
				paddingBottom: "env(safe-area-inset-bottom)",
			}}
			aria-label="Основная навигация"
		>
			{TABS.map((tab) => {
				const isActive = tab.match(pathname ?? "");
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
					>
						<HugeiconsIcon
							icon={tab.icon}
							className={cn(
								"size-6 transition-colors",
								isActive ? "text-primary" : "text-muted-foreground",
							)}
							strokeWidth={isActive ? 2 : 1.5}
						/>
						<span
							className={cn(
								"text-[0.68rem] leading-none font-medium transition-colors",
								isActive ? "text-primary" : "text-muted-foreground",
							)}
						>
							{tab.label}
						</span>
					</Link>
				);
			})}
		</nav>
	);
}
