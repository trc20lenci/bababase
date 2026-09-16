"""
Caption style presets, shared between the subtitle generator and the API's
validation layer. Each style controls font, color, position behaviour and
how each word is animated as it's spoken.
"""

CAPTION_STYLES = {
	"hormozi": {
		"name": "Hormozi",
		"font": "Anton",
		"font_size": 20,
		"primary_color": "&H00FFFFFF",  # white
		"highlight_color": "&H0000D7FF",  # gold/yellow (BGR)
		"outline_color": "&H00000000",
		"outline_width": 3.5,
		"shadow": 0,
		"bold": True,
		"uppercase": True,
		"animation": "pop",  # word scales up + highlight color when spoken
		"max_words_per_line": 3,
	},
	"mrbeast": {
		"name": "MrBeast",
		"font": "Komika Axis",
		"font_size": 22,
		"primary_color": "&H00FFFFFF",
		"highlight_color": "&H0000FF00",  # green
		"outline_color": "&H00000000",
		"outline_width": 4,
		"shadow": 1,
		"bold": True,
		"uppercase": True,
		"animation": "bounce",
		"max_words_per_line": 2,
	},
	"karaoke": {
		"name": "Karaoke",
		"font": "Montserrat",
		"font_size": 18,
		"primary_color": "&H00E0E0E0",
		"highlight_color": "&H00FF3DE0",  # pink/magenta
		"outline_color": "&H00000000",
		"outline_width": 2,
		"shadow": 0,
		"bold": True,
		"uppercase": False,
		"animation": "karaoke",  # classic left-to-right sweep fill
		"max_words_per_line": 6,
	},
	"minimal": {
		"name": "Minimal",
		"font": "Helvetica Neue",
		"font_size": 16,
		"primary_color": "&H00FFFFFF",
		"highlight_color": "&H00FFFFFF",
		"outline_color": "&H00000000",
		"outline_width": 1.5,
		"shadow": 0,
		"bold": False,
		"uppercase": False,
		"animation": "fade",
		"max_words_per_line": 5,
	},
	"bounce": {
		"name": "Bounce",
		"font": "Poppins",
		"font_size": 20,
		"primary_color": "&H00FFFFFF",
		"highlight_color": "&H00FFA500",
		"outline_color": "&H00000000",
		"outline_width": 3,
		"shadow": 0,
		"bold": True,
		"uppercase": False,
		"animation": "bounce",
		"max_words_per_line": 3,
	},
	"classic": {
		"name": "Classic",
		"font": "Arial",
		"font_size": 16,
		"primary_color": "&H00FFFFFF",
		"highlight_color": "&H00FFFFFF",
		"outline_color": "&H00000000",
		"outline_width": 2,
		"shadow": 1,
		"bold": False,
		"uppercase": False,
		"animation": "none",
		"max_words_per_line": 8,
	},
}

DEFAULT_STYLE_ID = "classic"


def is_valid_style(style_id: str) -> bool:
	return style_id in CAPTION_STYLES


def is_valid_position(position: int) -> bool:
	return isinstance(position, int) and 5 <= position <= 50
