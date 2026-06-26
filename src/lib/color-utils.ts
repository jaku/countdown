function parseHexChannels(hex: string): { r: number; g: number; b: number } | null {
	const trimmed = hex.trim();
	const hex8 = trimmed.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
	if (hex8) {
		return {
			r: parseInt(hex8[1], 16),
			g: parseInt(hex8[2], 16),
			b: parseInt(hex8[3], 16)
		};
	}
	const hex6 = trimmed.match(/^#([0-9a-fA-F]{6})$/);
	if (hex6) {
		const value = hex6[1];
		return {
			r: parseInt(value.slice(0, 2), 16),
			g: parseInt(value.slice(2, 4), 16),
			b: parseInt(value.slice(4, 6), 16)
		};
	}
	const hex3 = trimmed.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
	if (hex3) {
		return {
			r: parseInt(hex3[1] + hex3[1], 16),
			g: parseInt(hex3[2] + hex3[2], 16),
			b: parseInt(hex3[3] + hex3[3], 16)
		};
	}
	return null;
}

export function parseHexAlpha(hex: string): number | null {
	const match = hex.trim().match(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})$/);
	if (!match) return null;
	return Math.round((parseInt(match[1], 16) / 255) * 100);
}

export function colorWithOpacity(hex: string, opacityPercent: number): string {
	const channels = parseHexChannels(hex);
	if (!channels) return hex;

	const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;
	return `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${alpha})`;
}
