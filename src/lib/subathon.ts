import type { SubathonCoinTracking, SubathonDisplay, SubathonState } from '$lib/subathon-types';
import { colorWithOpacity } from '$lib/color-utils';
import {
	SUBATHON_DEFAULTS,
	defaultCoinTracking,
	defaultDisplay,
	normalizeDisplay
} from '$lib/subathon-types';

export type { SubathonState, SubathonDisplay, SubathonCoinTracking, DisplayMode } from '$lib/subathon-types';
export { SUBATHON_DEFAULTS, defaultDisplay, defaultCoinTracking } from '$lib/subathon-types';

export function storageKey(key: string): string {
	return `subathon:${key}`;
}

export const CONTROL_KEY_STORAGE = 'subathon:control-key';

export function loadControlKey(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(CONTROL_KEY_STORAGE);
}

export function saveControlKey(key: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(CONTROL_KEY_STORAGE, key.trim());
}

export function clearControlKey(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(CONTROL_KEY_STORAGE);
}

export function subscribeControlKey(onUpdate: (key: string | null) => void): () => void {
	if (typeof window === 'undefined') return () => {};

	const read = (): string | null => loadControlKey();

	const onStorage = (event: StorageEvent) => {
		if (event.key !== CONTROL_KEY_STORAGE) return;
		onUpdate(event.newValue);
	};

	window.addEventListener('storage', onStorage);

	let lastRaw = localStorage.getItem(CONTROL_KEY_STORAGE);
	const poll = setInterval(() => {
		const raw = localStorage.getItem(CONTROL_KEY_STORAGE);
		if (raw === lastRaw) return;
		lastRaw = raw;
		onUpdate(read());
	}, 1000);

	return () => {
		window.removeEventListener('storage', onStorage);
		clearInterval(poll);
	};
}

export function normalizeState(raw: Partial<SubathonState> | null | undefined): SubathonState {
	const duration = raw?.defaultDuration ?? SUBATHON_DEFAULTS.duration;
	const now = Date.now();
	const endTime =
		typeof raw?.endTime === 'number' ? raw.endTime : now + duration * 1000;

	return {
		paused: raw?.paused ?? false,
		pausedRemaining: raw?.pausedRemaining ?? 0,
		endTime,
		secondsPerCoin: raw?.secondsPerCoin ?? SUBATHON_DEFAULTS.secondsPerCoin,
		defaultDuration: duration,
		barMaxSeconds: raw?.barMaxSeconds ?? duration,
		display: normalizeDisplay(raw?.display),
		coins: { ...defaultCoinTracking(), ...raw?.coins },
		lastCoinGain: raw?.lastCoinGain
	};
}

export function loadState(key: string): SubathonState | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(storageKey(key));
		if (!raw) return null;
		return normalizeState(JSON.parse(raw) as Partial<SubathonState>);
	} catch {
		return null;
	}
}

export function saveState(key: string, state: SubathonState): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(storageKey(key), JSON.stringify(state));

	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('subathon-state', { detail: { key, state } })
		);
	}
}

export function clearState(key: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(storageKey(key));
}

export function getRemaining(state: SubathonState, now: number = Date.now()): number {
	if (state.paused) {
		return Math.max(0, Math.round(state.pausedRemaining));
	}

	return Math.max(0, Math.round((state.endTime - now) / 1000));
}

export function getBarStatusColor(state: SubathonState, remainingSeconds: number): string {
	const { display } = state;
	const criticalMinutes = Math.max(0, Number(display.barCriticalMinutes) || 0);
	const warnMinutes = Math.max(criticalMinutes, Number(display.barWarnMinutes) || 0);
	const criticalSeconds = criticalMinutes * 60;
	const warnSeconds = warnMinutes * 60;

	if (remainingSeconds < criticalSeconds) return display.barCriticalColor;
	if (remainingSeconds < warnSeconds) return display.barWarnColor;
	return display.barOkColor;
}

export function getBarStatusBackground(state: SubathonState, remainingSeconds: number): string {
	const color = getBarStatusColor(state, remainingSeconds);
	return colorWithOpacity(color, state.display.barOpacity);
}

export function createInitialState(overrides: Partial<SubathonState> = {}): SubathonState {
	const duration = overrides.defaultDuration ?? SUBATHON_DEFAULTS.duration;
	const now = Date.now();

	return normalizeState({
		paused: false,
		pausedRemaining: 0,
		endTime: now + duration * 1000,
		secondsPerCoin: SUBATHON_DEFAULTS.secondsPerCoin,
		defaultDuration: duration,
		barMaxSeconds: duration,
		...overrides,
		display: normalizeDisplay(overrides.display),
		coins: { ...defaultCoinTracking(), ...overrides.coins }
	});
}

export function addTime(state: SubathonState, seconds: number): SubathonState {
	if (seconds <= 0) return state;

	if (state.paused) {
		return {
			...state,
			pausedRemaining: state.pausedRemaining + seconds,
			barMaxSeconds: state.barMaxSeconds + seconds
		};
	}

	return {
		...state,
		endTime: state.endTime + seconds * 1000,
		barMaxSeconds: state.barMaxSeconds + seconds
	};
}

export function removeTime(state: SubathonState, seconds: number, now: number = Date.now()): SubathonState {
	if (seconds <= 0) return state;

	if (state.paused) {
		return {
			...state,
			pausedRemaining: Math.max(0, state.pausedRemaining - seconds)
		};
	}

	return {
		...state,
		endTime: Math.max(now, state.endTime - seconds * 1000)
	};
}

export function togglePause(state: SubathonState, now: number = Date.now()): SubathonState {
	if (state.paused) {
		return {
			...state,
			paused: false,
			endTime: now + state.pausedRemaining * 1000,
			pausedRemaining: 0
		};
	}

	return {
		...state,
		paused: true,
		pausedRemaining: getRemaining(state, now)
	};
}

export function setTime(
	state: SubathonState,
	seconds: number,
	options: { startPaused?: boolean } = {}
): SubathonState {
	const total = Math.max(0, seconds);
	const startPaused = options.startPaused ?? state.paused;

	if (startPaused) {
		return {
			...state,
			paused: true,
			pausedRemaining: total,
			endTime: Date.now(),
			barMaxSeconds: total
		};
	}

	return {
		...state,
		paused: false,
		pausedRemaining: 0,
		endTime: Date.now() + total * 1000,
		barMaxSeconds: total
	};
}

/** CC payment fields use hundredths (100 = 1 coin). */
export function ccUnitsToCoins(units: number): number {
	return units / 100;
}

export function coinsToSeconds(coins: number, state: SubathonState): number {
	if (coins <= 0) return 0;
	return coins * state.secondsPerCoin;
}

export function addCoinGain(state: SubathonState, seconds: number): SubathonState {
	if (seconds <= 0) return state;
	return adjustTimeWithGain(state, seconds);
}

export function adjustTimeWithGain(state: SubathonState, seconds: number): SubathonState {
	if (seconds === 0) return state;

	const next = seconds > 0 ? addTime(state, seconds) : removeTime(state, -seconds);

	if (state.display.showGainAnimation === false) return next;

	return {
		...next,
		lastCoinGain: { seconds, nonce: Date.now() + Math.random() }
	};
}

export function addPaidCoins(state: SubathonState, coins: number): SubathonState {
	return addCoinGain(state, coinsToSeconds(coins, state));
}

export function addCcPaidUnits(state: SubathonState, paidUnits: number): SubathonState {
	return addPaidCoins(state, ccUnitsToCoins(paidUnits));
}

export function effectPaidUnits(
	payments: { global: { paid: number }; local: { paid: number } },
	coins: SubathonCoinTracking
): number {
	let total = 0;
	if (coins.globalPaid) total += payments.global.paid;
	if (coins.localPaid) total += payments.local.paid;
	return total;
}

/** Bits exchange amount is in hundredths; Twitch bits credit ~80% as coins. */
export function bitsExchangeToSeconds(amount: number, state: SubathonState): number {
	if (amount <= 0) return 0;
	return coinsToSeconds(ccUnitsToCoins(amount) * 0.8, state);
}

export function statesEqual(a: SubathonState, b: SubathonState): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export function subscribeState(
	key: string,
	onUpdate: (state: SubathonState | null) => void
): () => void {
	if (typeof window === 'undefined') return () => {};

	const read = (): SubathonState | null => loadState(key);

	const onStorage = (event: StorageEvent) => {
		if (event.key !== storageKey(key)) return;
		if (!event.newValue) {
			onUpdate(null);
			return;
		}

		try {
			onUpdate(normalizeState(JSON.parse(event.newValue) as Partial<SubathonState>));
		} catch {
			onUpdate(null);
		}
	};

	window.addEventListener('storage', onStorage);

	const onLocalSave = (event: Event) => {
		const detail = (event as CustomEvent<{ key: string; state: SubathonState }>).detail;
		if (detail?.key !== key) return;
		onUpdate(normalizeState(detail.state));
	};

	window.addEventListener('subathon-state', onLocalSave as EventListener);

	let lastRaw = localStorage.getItem(storageKey(key));
	const poll = setInterval(() => {
		const raw = localStorage.getItem(storageKey(key));
		if (raw === lastRaw) return;
		lastRaw = raw;
		onUpdate(read());
	}, 250);

	return () => {
		window.removeEventListener('storage', onStorage);
		window.removeEventListener('subathon-state', onLocalSave as EventListener);
		clearInterval(poll);
	};
}

export function initOrLoadState(
	key: string,
	overrides: Partial<SubathonState> = {},
	options: { clear?: boolean } = {}
): SubathonState {
	if (options.clear) clearState(key);

	const saved = options.clear ? null : loadState(key);
	if (saved) return normalizeState({ ...saved, ...overrides, display: { ...saved.display, ...overrides.display }, coins: { ...saved.coins, ...overrides.coins } });

	const state = createInitialState(overrides);
	saveState(key, state);
	return state;
}
