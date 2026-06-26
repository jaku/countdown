function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatGainLabel(seconds: number): string {
	const sign = seconds < 0 ? '−' : '+';
	const total = Math.max(1, Math.round(Math.abs(seconds)));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;

	const parts: string[] = [];

	if (hours > 0) parts.push(plural(hours, 'hour'));
	if (minutes > 0) parts.push(plural(minutes, 'minute'));
	if (secs > 0 || parts.length === 0) parts.push(plural(secs, 'second'));

	return `${sign}${parts.join(' ')}`;
}
