import type { SubathonState } from '$lib/subathon-types';

import { SUBATHON_DEFAULTS } from '$lib/subathon-types';



export function parseSubathonOverrides(

	params: URLSearchParams

): Partial<SubathonState> & { clear?: boolean } {

	const overrides: Partial<SubathonState> & { clear?: boolean } = {};



	if (params.has('clear')) overrides.clear = true;



	if (params.has('duration')) {

		const duration = parseInt(params.get('duration') || '', 10);

		if (Number.isFinite(duration) && duration >= 0) {

			overrides.defaultDuration = duration;

		}

	}



	if (params.has('secondsPerCoin')) {

		const rate = parseFloat(params.get('secondsPerCoin') || '');

		if (Number.isFinite(rate) && rate > 0) overrides.secondsPerCoin = rate;

	} else if (params.has('secondsPerDollar')) {

		const rate = parseFloat(params.get('secondsPerDollar') || '');

		if (Number.isFinite(rate) && rate > 0) overrides.secondsPerCoin = rate;

	}



	const display: Partial<SubathonState['display']> & { barFill?: string } = {};

	if (params.has('mode')) {

		const mode = params.get('mode');

		if (mode === 'timer' || mode === 'bar') display.mode = mode;

	}

	if (params.has('font')) display.font = params.get('font') || SUBATHON_DEFAULTS.display.font;

	if (params.has('size')) display.size = params.get('size') || SUBATHON_DEFAULTS.display.size;

	if (params.has('color')) display.color = params.get('color') || SUBATHON_DEFAULTS.display.color;

	if (params.has('text')) display.text = params.get('text') ?? '';

	if (params.has('barOkColor') || params.has('barFill')) {

		display.barOkColor =

			params.get('barOkColor') || params.get('barFill') || SUBATHON_DEFAULTS.display.barOkColor;

	}

	if (params.has('barWarnColor')) {

		display.barWarnColor = params.get('barWarnColor') || SUBATHON_DEFAULTS.display.barWarnColor;

	}

	if (params.has('barCriticalColor')) {

		display.barCriticalColor =

			params.get('barCriticalColor') || SUBATHON_DEFAULTS.display.barCriticalColor;

	}

	if (params.has('barWarnMinutes')) {

		const minutes = parseInt(params.get('barWarnMinutes') || '', 10);

		if (Number.isFinite(minutes) && minutes >= 0) display.barWarnMinutes = minutes;

	}

	if (params.has('barCriticalMinutes')) {

		const minutes = parseInt(params.get('barCriticalMinutes') || '', 10);

		if (Number.isFinite(minutes) && minutes >= 0) display.barCriticalMinutes = minutes;

	}

	if (params.has('barOpacity')) {
		const opacity = parseInt(params.get('barOpacity') || '', 10);
		if (Number.isFinite(opacity) && opacity >= 0 && opacity <= 100) display.barOpacity = opacity;
	}

	if (params.has('gainColor')) {

		display.gainColor = params.get('gainColor') || SUBATHON_DEFAULTS.display.gainColor;

	}

	if (Object.keys(display).length > 0) {

		overrides.display = display as SubathonState['display'];

	}



	return overrides;

}

