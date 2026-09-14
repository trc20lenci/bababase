"use client";

import { useParams } from "next/navigation";
import { EditorHeader } from "@/components/editor/editor-header";
import { EditorProvider } from "@/components/providers/editor-provider";
import { Onboarding } from "@/components/editor/onboarding";
import { MigrationDialog } from "@/components/editor/dialogs/migration-dialog";
import { MobileEditorLayout } from "@/components/editor/mobile/mobile-editor-layout";
import { AppFrame } from "@/components/mobile/app-frame";

export default function Editor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<EditorProvider projectId={projectId}>
			<AppFrame dark>
				<EditorHeader />
				<div className="min-h-0 min-w-0 flex-1">
					<MobileEditorLayout />
				</div>
				<Onboarding />
				<MigrationDialog />
			</AppFrame>
		</EditorProvider>
	);
}
