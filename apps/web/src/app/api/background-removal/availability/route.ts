import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

export async function GET() {
	if (!webEnv.BG_REMOVAL_SERVICE_URL) {
		return NextResponse.json({ available: false });
	}

	try {
		const response = await fetch(
			new URL("/api/health", webEnv.BG_REMOVAL_SERVICE_URL),
			{
				headers: webEnv.BG_REMOVAL_SERVICE_API_KEY
					? { "X-API-Key": webEnv.BG_REMOVAL_SERVICE_API_KEY }
					: undefined,
				cache: "no-store",
				signal: AbortSignal.timeout(4000),
			},
		);
		return NextResponse.json({ available: response.ok });
	} catch {
		return NextResponse.json({ available: false, unreachable: true });
	}
}
