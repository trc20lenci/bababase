import { create } from "zustand";

interface KeyframeEditorState {
	/** Whether the keyframe pan/zoom gesture mode is active for the mobile preview. */
	isActive: boolean;
	/** The keyframe currently being edited by canvas gestures, if any. */
	activeKeyframeId: string | null;
	setIsActive: ({ isActive }: { isActive: boolean }) => void;
	setActiveKeyframeId: ({ id }: { id: string | null }) => void;
}

export const useKeyframeEditorStore = create<KeyframeEditorState>((set) => ({
	isActive: false,
	activeKeyframeId: null,
	setIsActive: ({ isActive }) =>
		set({ isActive, activeKeyframeId: null }),
	setActiveKeyframeId: ({ id }) => set({ activeKeyframeId: id }),
}));
