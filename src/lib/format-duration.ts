const DAY = 86_400;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export interface DurationPart {
	value: string;
	unit: string;
}

function pushPart(parts: DurationPart[], value: number, unit: string, digits?: number) {
	const text =
		digits !== undefined ? String(value).padStart(digits, '0') : String(value);
	parts.push({ value: text, unit });
}

function formatSecondsValue(seconds: number, decimals: number): string {
	if (decimals <= 0) return String(Math.floor(seconds)).padStart(2, '0');
	return seconds.toFixed(decimals);
}

export function decomposeDuration(
	totalSeconds: number,
	options: { secondDecimals?: number } = {}
): DurationPart[] {
	const secondDecimals = options.secondDecimals ?? 0;
	const total = Math.max(0, totalSeconds);

	let remaining = secondDecimals > 0 ? total : Math.max(0, Math.round(total));

	const years = Math.floor(remaining / YEAR);
	remaining %= YEAR;

	const months = Math.floor(remaining / MONTH);
	remaining %= MONTH;

	const weeks = Math.floor(remaining / WEEK);
	remaining %= WEEK;

	const days = Math.floor(remaining / DAY);
	remaining %= DAY;

	const hours = Math.floor(remaining / 3_600);
	remaining %= 3_600;

	const minutes = Math.floor(remaining / 60);
	const seconds = remaining % 60;

	const parts: DurationPart[] = [];
	const pushSeconds = () => parts.push({ value: formatSecondsValue(seconds, secondDecimals), unit: 's' });

	if (years > 0) {
		pushPart(parts, years, 'y');
		pushPart(parts, months, 'M', 2);
		pushPart(parts, weeks, 'w', 2);
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushSeconds();
		return parts;
	}

	if (months > 0) {
		pushPart(parts, months, 'M');
		pushPart(parts, weeks, 'w', 2);
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushSeconds();
		return parts;
	}

	if (weeks > 0) {
		pushPart(parts, weeks, 'w');
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushSeconds();
		return parts;
	}

	if (days > 0) {
		pushPart(parts, days, 'd');
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushSeconds();
		return parts;
	}

	if (hours > 0) {
		pushPart(parts, hours, 'h');
		pushPart(parts, minutes, 'm', 2);
		pushSeconds();
		return parts;
	}

	if (minutes > 0) {
		pushPart(parts, minutes, 'm');
		pushSeconds();
		return parts;
	}

	pushSeconds();
	return parts;
}

export function formatDuration(
	totalSeconds: number,
	options: { secondDecimals?: number } = {}
): string {
	return decomposeDuration(totalSeconds, options)
		.map((part) => `${part.value}${part.unit}`)
		.join(' ');
}

export function parseTimeInput(hours: number, minutes: number, seconds: number): number {
	return Math.max(0, Math.floor(hours) * 3600 + Math.floor(minutes) * 60 + Math.floor(seconds));
}
