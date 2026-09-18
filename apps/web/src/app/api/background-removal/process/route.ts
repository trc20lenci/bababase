import { webEnv } from "@opencut/env/web";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
	if (!webEnv.BG_REMOVAL_SERVICE_URL) {
		return NextResponse.json(
			{
				error:
					"Удаление фона не настроено. Задайте BG_REMOVAL_SERVICE_URL для этой функции.",
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
	const file = incomingForm.get("file");
	if (!(file instanceof File)) {
		return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
	}

	const forwardForm = new FormData();
	forwardForm.set("file", file, file.name);

	const background = incomingForm.get("background");
	if (typeof background === "string") {
		forwardForm.set("background", background);
	}
	const color = incomingForm.get("color");
	if (typeof color === "string") {
		forwardForm.set("color", color);
	}

	try {
		const response = await fetch(
			new URL("/api/process", webEnv.BG_REMOVAL_SERVICE_URL),
			{
				method: "POST",
				headers: webEnv.BG_REMOVAL_SERVICE_API_KEY
					? { "X-API-Key": webEnv.BG_REMOVAL_SERVICE_API_KEY }
					: undefined,
				body: forwardForm,
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
