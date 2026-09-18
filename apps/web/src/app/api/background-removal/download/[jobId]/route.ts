import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	if (!webEnv.BG_REMOVAL_SERVICE_URL) {
		return NextResponse.json(
			{ error: "Background removal service is not configured" },
			{ status: 503 },
		);
	}

	const { jobId } = await params;

	try {
		const response = await fetch(
			new URL(`/api/download/${jobId}`, webEnv.BG_REMOVAL_SERVICE_URL),
			{
				headers: webEnv.BG_REMOVAL_SERVICE_API_KEY
					? { "X-API-Key": webEnv.BG_REMOVAL_SERVICE_API_KEY }
					: undefined,
			},
		);

		if (!response.ok || !response.body) {
			const data = await response.json().catch(() => ({}));
			return NextResponse.json(data, { status: response.status });
		}

		const contentType = response.headers.get("Content-Type") ?? "application/octet-stream";
		const contentDisposition = response.headers.get("Content-Disposition");

		return new NextResponse(response.body, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				...(contentDisposition
					? { "Content-Disposition": contentDisposition }
					: {}),
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Не удалось связаться с сервером удаления фона" },
			{ status: 502 },
		);
	}
}
