"use client";

import { PreviewPanel } from "@/components/editor/panels/preview";
import { Timeline } from "@/components/editor/timeline";
import { MobileEditorToolbar } from "./mobile-editor-toolbar";

export function MobileEditorLayout() {
	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<div className="min-h-0 flex-1 px-2 pt-2">
				<PreviewPanel />
			</div>
			<div className="h-64 shrink-0 px-2 pb-1">
				<Timeline />
			</div>
			<MobileEditorToolbar />
		</div>
	);
}
