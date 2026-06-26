import { parseHexAlpha } from '$lib/color-utils';

export type DisplayMode = 'timer' | 'bar';

export interface SubathonDisplay {
	mode: DisplayMode;
	font: string;
	size: string;
	color: string;
	text: string;
	barOkColor: string;
	barWarnColor: string;
	barCriticalColor: string;
	barWarnMinutes: number;
	barCriticalMinutes: number;
	barOpacity: number;
	gainColor: string;
	showGainAnimation: boolean;
}

export interface SubathonCoinTracking {
	globalPaid: boolean;
	localPaid: boolean;
	bitsExchange: boolean;
}

export interface SubathonState {
	paused: boolean;
	pausedRemaining: number;
	endTime: number;
	secondsPerCoin: number;
	defaultDuration: number;
	barMaxSeconds: number;
	display: SubathonDisplay;
	coins: SubathonCoinTracking;
	lastCoinGain?: { seconds: number; nonce: number };
}

export const SUBATHON_DEFAULTS = {
	duration: 3600,
	secondsPerCoin: 1,
	display: {
		mode: 'bar' as DisplayMode,
		font: 'Roboto+Mono',
		size: '6em',
		color: '#ffffff',
		text: '',
		barOkColor: '#5ccc5a',
		barWarnColor: '#e6c200',
		barCriticalColor: '#d94444',
		barWarnMinutes: 60,
		barCriticalMinutes: 10,
		barOpacity: 100,
		gainColor: '#9dff9d',
		showGainAnimation: true
	},
	coins: {
		globalPaid: true,
		localPaid: true,
		bitsExchange: false
	}
} as const;

export function defaultDisplay(): SubathonDisplay {
	return { ...SUBATHON_DEFAULTS.display };
}

/** @deprecated Legacy display fields from shrinking-bar mode. */
interface LegacySubathonDisplay extends Partial<SubathonDisplay> {
	barFill?: string;
	barTrack?: string;
}

function legacyBarOpacity(raw: LegacySubathonDisplay, fallback: number): number {
	if (raw.barOpacity !== undefined) return Number(raw.barOpacity);
	if (raw.barTrack) {
		const alpha = parseHexAlpha(raw.barTrack);
		if (alpha !== null) return alpha;
	}
	return fallback;
}

export function normalizeDisplay(raw: LegacySubathonDisplay = {}): SubathonDisplay {
	const defaults = defaultDisplay();

	const barWarnMinutes = Number(raw.barWarnMinutes ?? defaults.barWarnMinutes);
	const barCriticalMinutes = Number(raw.barCriticalMinutes ?? defaults.barCriticalMinutes);
	const barOpacity = legacyBarOpacity(raw, defaults.barOpacity);

	return {
		...defaults,
		...raw,
		barOkColor: raw.barOkColor ?? raw.barFill ?? defaults.barOkColor,
		barWarnColor: raw.barWarnColor ?? defaults.barWarnColor,
		barCriticalColor: raw.barCriticalColor ?? defaults.barCriticalColor,
		barWarnMinutes: Number.isFinite(barWarnMinutes) ? barWarnMinutes : defaults.barWarnMinutes,
		barCriticalMinutes: Number.isFinite(barCriticalMinutes)
			? barCriticalMinutes
			: defaults.barCriticalMinutes,
		barOpacity: Number.isFinite(barOpacity)
			? Math.max(0, Math.min(100, Math.round(barOpacity)))
			: defaults.barOpacity
	};
}

export function defaultCoinTracking(): SubathonCoinTracking {
	return { ...SUBATHON_DEFAULTS.coins };
}
