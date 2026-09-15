const FEATURES = [
	"Монтаж без границ",
	"ИИ-субтитры за секунды",
	"Экспорт в 4K",
	"Ваши видео остаются у вас",
	"Работает прямо в приложении",
	"Наложения, переходы, звук",
];

export function MarqueeBanner() {
	const items = [...FEATURES, ...FEATURES];

	return (
		<div className="border-primary/15 bg-primary/10 relative flex overflow-hidden rounded-full border py-2">
			<div className="animate-marquee flex w-max shrink-0 items-center gap-3 whitespace-nowrap px-3">
				{items.map((feature, i) => (
					<span
						key={`${feature}-${i}`}
						className="text-primary flex items-center gap-3 text-xs font-medium"
					>
						{feature}
						<span className="bg-primary/40 size-1 rounded-full" />
					</span>
				))}
			</div>
		</div>
	);
}
