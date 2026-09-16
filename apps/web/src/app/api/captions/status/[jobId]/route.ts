import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

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
			new URL(`/api/status/${jobId}`, webEnv.CAPTIONS_SERVICE_URL),
			{
				headers: webEnv.CAPTIONS_SERVICE_API_KEY
					? { "X-API-Key": webEnv.CAPTIONS_SERVICE_API_KEY }
					: undefined,
				cache: "no-store",
			},
		);
		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch {
		return NextResponse.json(
			{ error: "Не удалось связаться с сервером субтитров" },
			{ status: 502 },
		);
	}
}
