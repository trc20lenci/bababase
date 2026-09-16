import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	if (!webEnv.CAPTIONS_SERVICE_URL) {
		return NextResponse.json(
			{ error: "Captions service is not configured" },
			{ status: 503 },
		);
	}

	const { jobId } = await params;

	try {
		const response = await fetch(
			new URL(`/api/download/${jobId}`, webEnv.CAPTIONS_SERVICE_URL),
			{
				headers: webEnv.CAPTIONS_SERVICE_API_KEY
					? { "X-API-Key": webEnv.CAPTIONS_SERVICE_API_KEY }
					: undefined,
			},
		);

		if (!response.ok || !response.body) {
			const data = await response.json().catch(() => ({}));
			return NextResponse.json(data, { status: response.status });
		}

		return new NextResponse(response.body, {
			status: 200,
			headers: {
				"Content-Type": "video/mp4",
				"Content-Disposition": `attachment; filename="captioned-${jobId}.mp4"`,
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Не удалось связаться с сервером субтитров" },
			{ status: 502 },
		);
	}
}
