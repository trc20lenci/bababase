import { create } from "zustand";
import type { Tab } from "@/stores/assets-panel-store";

export type MobileToolScreenKey = "properties" | Tab;

interface MobileToolScreenState {
	/** Which tool currently owns the full screen, if any. `null` means the
	 * normal preview/timeline editor view is showing. */
	activeTool: MobileToolScreenKey | null;
	openTool: ({ tool }: { tool: MobileToolScreenKey }) => void;
	closeTool: () => void;
}

export const useMobileToolScreenStore = create<MobileToolScreenState>(
	(set) => ({
		activeTool: null,
		openTool: ({ tool }) => set({ activeTool: tool }),
		closeTool: () => set({ activeTool: null }),
	}),
);
