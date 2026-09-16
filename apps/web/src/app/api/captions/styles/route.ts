import { webEnv } from "@opencut/env/web";
import { NextResponse } from "next/server";

const FALLBACK_STYLES = [
	{ id: "hormozi", name: "Hormozi" },
	{ id: "mrbeast", name: "MrBeast" },
	{ id: "karaoke", name: "Karaoke" },
	{ id: "minimal", name: "Minimal" },
	{ id: "bounce", name: "Bounce" },
	{ id: "classic", name: "Classic" },
];

export async function GET() {
	if (!webEnv.CAPTIONS_SERVICE_URL) {
		return NextResponse.json({ available: false, styles: [], default: null });
	}

	try {
		const response = await fetch(
			new URL("/api/styles", webEnv.CAPTIONS_SERVICE_URL),
			{
				headers: webEnv.CAPTIONS_SERVICE_API_KEY
					? { "X-API-Key": webEnv.CAPTIONS_SERVICE_API_KEY }
					: undefined,
				cache: "no-store",
				signal: AbortSignal.timeout(4000),
			},
		);
		if (!response.ok) {
			return NextResponse.json({
				available: true,
				styles: FALLBACK_STYLES,
				default: "classic",
			});
		}
		const data = await response.json();
		return NextResponse.json({ available: true, ...data });
	} catch {
		// Configured but unreachable right now -- let the client decide
		// how to communicate that instead of hard-failing the page.
		return NextResponse.json({
			available: false,
			unreachable: true,
			styles: [],
			default: null,
		});
	}
}
