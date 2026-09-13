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
			className="bg-background/95 border-border/60 fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t backdrop-blur-lg md:hidden"
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

/** Spacer to keep page content from being hidden behind the fixed tab bar on mobile. */
export function MobileTabBarSpacer() {
	return (
		<div
			className="h-[calc(3.75rem+env(safe-area-inset-bottom))] w-full shrink-0 md:hidden"
			aria-hidden
		/>
	);
}
