"""
Generates animated .ass subtitle files from word-level transcription
segments, in the style of trending short-form caption tools (Hormozi,
MrBeast, Karaoke, etc). Rendered later by ffmpeg's libass filter.

Input: a list of words, each `{"word": str, "start": float, "end": float}`
(seconds), as produced by faster-whisper with word_timestamps=True.
"""

import pysubs2

from caption_styles import CAPTION_STYLES, DEFAULT_STYLE_ID


def _seconds_to_ms(seconds: float) -> int:
	return int(round(seconds * 1000))


def _group_words_into_lines(words: list[dict], max_words_per_line: int) -> list[list[dict]]:
	"""Groups words into caption lines, also breaking on long pauses so a
	line never spans an unnatural silence."""
	lines: list[list[dict]] = []
	current: list[dict] = []

	for word in words:
		if current:
			gap = word["start"] - current[-1]["end"]
			if gap > 0.7 or len(current) >= max_words_per_line:
				lines.append(current)
				current = []
		current.append(word)

	if current:
		lines.append(current)

	return lines


def _build_line_text(
	line_words: list[dict],
	line_start: float,
	style: dict,
) -> str:
	"""Builds the ASS override-tag text for one caption line, animating
	each word relative to the line's own start time (as ASS \\t timing
	requires)."""
	animation = style["animation"]
	uppercase = style.get("uppercase", False)
	highlight = style["highlight_color"]

	parts: list[str] = []

	for word in line_words:
		text = word["word"].strip()
		if uppercase:
			text = text.upper()

		word_start_ms = _seconds_to_ms(word["start"] - line_start)
		word_end_ms = _seconds_to_ms(word["end"] - line_start)
		word_start_ms = max(0, word_start_ms)
		word_end_ms = max(word_start_ms + 60, word_end_ms)

		if animation == "karaoke":
			# \kf sweeps the highlight color across the word over its
			# spoken duration, in centiseconds.
			duration_cs = max(1, (word_end_ms - word_start_ms) // 10)
			parts.append(f"{{\\kf{duration_cs}}}{text} ")
			continue

		if animation == "pop":
			parts.append(
				"{\\t(%d,%d,\\fscx125\\fscy125\\c%s)}"
				"{\\t(%d,%d,\\fscx100\\fscy100\\c&HFFFFFF&)}%s "
				% (word_start_ms, word_start_ms + 90, highlight, word_start_ms + 90, word_end_ms + 120, text)
			)
			continue

		if animation == "bounce":
			parts.append(
				"{\\t(%d,%d,\\fscy140\\c%s)}"
				"{\\t(%d,%d,\\fscy100)}"
				"{\\t(%d,%d,\\c&HFFFFFF&)}%s "
				% (
					word_start_ms,
					word_start_ms + 80,
					highlight,
					word_start_ms + 80,
					word_start_ms + 180,
					word_end_ms,
					word_end_ms + 150,
					text,
				)
			)
			continue

		if animation == "fade":
			parts.append(
				"{\\alpha&HFF&\\t(%d,%d,\\alpha&H00&)}%s "
				% (word_start_ms, word_start_ms + 120, text)
			)
			continue

		# "none" / classic: plain text, no per-word tags.
		parts.append(f"{text} ")

	return "".join(parts).strip()


def generate_ass_subtitles(
	*,
	words: list[dict],
	style_id: str,
	position_percent: int,
	video_width: int,
	video_height: int,
	output_path: str,
) -> str:
	"""Writes an .ass file to `output_path` and returns that path."""
	style = CAPTION_STYLES.get(style_id, CAPTION_STYLES[DEFAULT_STYLE_ID])

	subs = pysubs2.SSAFile()
	subs.info["PlayResX"] = str(video_width)
	subs.info["PlayResY"] = str(video_height)

	primary = pysubs2.Color(255, 255, 255)
	outline = pysubs2.Color(0, 0, 0)

	# Vertical position: `position_percent` is "percent from the bottom",
	# matching the original tool's API so styles behave the same way.
	margin_v = int(video_height * (position_percent / 100))

	ass_style = pysubs2.SSAStyle(
		fontname=style["font"],
		fontsize=style["font_size"] * (video_width / 1080),
		primarycolor=primary,
		outlinecolor=outline,
		bold=style["bold"],
		outline=style["outline_width"],
		shadow=style["shadow"],
		alignment=pysubs2.Alignment.BOTTOM_CENTER,
		marginv=margin_v,
		marginl=video_width * 0.08,
		marginr=video_width * 0.08,
	)
	subs.styles["Default"] = ass_style

	lines = _group_words_into_lines(words, style["max_words_per_line"])

	for line_words in lines:
		if not line_words:
			continue
		line_start = line_words[0]["start"]
		line_end = line_words[-1]["end"]
		text = _build_line_text(line_words, line_start, style)

		event = pysubs2.SSAEvent(
			start=_seconds_to_ms(line_start),
			end=_seconds_to_ms(line_end),
			text=text,
			style="Default",
		)
		subs.events.append(event)

	subs.save(output_path)
	return output_path
