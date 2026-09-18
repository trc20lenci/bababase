import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

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
			new URL(`/api/status/${jobId}`, webEnv.BG_REMOVAL_SERVICE_URL),
			{
				headers: webEnv.BG_REMOVAL_SERVICE_API_KEY
					? { "X-API-Key": webEnv.BG_REMOVAL_SERVICE_API_KEY }
					: undefined,
				cache: "no-store",
			},
		);
		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch {
		return NextResponse.json(
			{ error: "Не удалось связаться с сервером удаления фона" },
			{ status: 502 },
		);
	}
}
