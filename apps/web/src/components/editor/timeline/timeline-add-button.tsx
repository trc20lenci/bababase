"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { useMobileToolScreenStore } from "@/stores/mobile-tool-screen-store";

/**
 * Fixed "+" pinned to the right edge of the timeline area, matching the
 * add-media affordance in CapCut. It stays put while the strip scrolls
 * underneath, so adding another clip is always one tap away.
 */
export function TimelineAddButton() {
	const { openTool } = useMobileToolScreenStore();

	return (
		<button
			type="button"
			aria-label="Добавить медиа"
			onClick={() => openTool({ tool: "media" })}
			className="bg-foreground text-background absolute top-2 right-2 z-30 flex size-10 items-center justify-center rounded-lg shadow-lg active:scale-95"
		>
			<HugeiconsIcon icon={PlusSignIcon} className="size-6" />
		</button>
	);
}
