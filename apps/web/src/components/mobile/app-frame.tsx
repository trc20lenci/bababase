import type { ReactNode } from "react";
import { cn } from "@/utils/ui";

/**
 * Wraps every app screen in a fixed-width phone-like frame. On an actual
 * phone this is edge-to-edge (viewport is already narrower than the max
 * width). On a desktop browser it keeps the app looking like a mobile app
 * instead of stretching into a website layout.
 */
export function AppFrame({
	children,
	className,
	dark,
}: {
	children: ReactNode;
	className?: string;
	dark?: boolean;
}) {
	return (
		<div className="bg-neutral-950 flex min-h-[100dvh] w-full justify-center">
			<div
				className={cn(
					"relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background text-foreground md:shadow-2xl",
					dark && "dark",
					className,
				)}
			>
				{children}
			</div>
		</div>
	);
}
