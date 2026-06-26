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

export function decomposeDuration(totalSeconds: number): DurationPart[] {
	const total = Math.max(0, Math.round(totalSeconds));

	let remaining = total;

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

	if (years > 0) {
		pushPart(parts, years, 'y');
		pushPart(parts, months, 'M', 2);
		pushPart(parts, weeks, 'w', 2);
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	if (months > 0) {
		pushPart(parts, months, 'M');
		pushPart(parts, weeks, 'w', 2);
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	if (weeks > 0) {
		pushPart(parts, weeks, 'w');
		pushPart(parts, days, 'd', 2);
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	if (days > 0) {
		pushPart(parts, days, 'd');
		pushPart(parts, hours, 'h', 2);
		pushPart(parts, minutes, 'm', 2);
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	if (hours > 0) {
		pushPart(parts, hours, 'h');
		pushPart(parts, minutes, 'm', 2);
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	if (minutes > 0) {
		pushPart(parts, minutes, 'm');
		pushPart(parts, seconds, 's', 2);
		return parts;
	}

	pushPart(parts, seconds, 's', 2);
	return parts;
}

export function formatDuration(totalSeconds: number): string {
	return decomposeDuration(totalSeconds)
		.map((part) => `${part.value}${part.unit}`)
		.join(' ');
}

export function parseTimeInput(hours: number, minutes: number, seconds: number): number {
	return Math.max(0, Math.floor(hours) * 3600 + Math.floor(minutes) * 60 + Math.floor(seconds));
}
