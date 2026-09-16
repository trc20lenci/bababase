import { webEnv } from "@opencut/env/web";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
	if (!webEnv.CAPTIONS_SERVICE_URL) {
		return NextResponse.json(
			{
				error:
					"Серверные субтитры не настроены. Задайте CAPTIONS_SERVICE_URL, чтобы включить эту функцию.",
			},
			{ status: 503 },
		);
	}

	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json(
			{ error: "Слишком много запросов, попробуйте позже" },
			{ status: 429 },
		);
	}

	const incomingForm = await request.formData();
	const video = incomingForm.get("video");
	if (!(video instanceof File)) {
		return NextResponse.json({ error: "Missing 'video' file" }, { status: 400 });
	}

	const forwardForm = new FormData();
	forwardForm.set("video", video, video.name);

	const captionStyle = incomingForm.get("captionStyle");
	if (typeof captionStyle === "string") {
		forwardForm.set("captionStyle", captionStyle);
	}
	const captionPosition = incomingForm.get("captionPosition");
	if (typeof captionPosition === "string") {
		forwardForm.set("captionPosition", captionPosition);
	}
	const language = incomingForm.get("language");
	if (typeof language === "string") {
		forwardForm.set("language", language);
	}

	try {
		const response = await fetch(
			new URL("/api/process", webEnv.CAPTIONS_SERVICE_URL),
			{
				method: "POST",
				headers: webEnv.CAPTIONS_SERVICE_API_KEY
					? { "X-API-Key": webEnv.CAPTIONS_SERVICE_API_KEY }
					: undefined,
				body: forwardForm,
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
