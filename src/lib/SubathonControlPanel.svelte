<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatDuration, parseTimeInput } from '$lib/format-duration';
	import {
		addPaidCoins,
		adjustTimeWithGain,
		getRemaining,
		setTime,
		togglePause,
		type SubathonState
	} from '$lib/subathon';

	export let state: SubathonState;
	export let remaining = 0;
	export let compact = false;

	const dispatch = createEventDispatcher<{ change: SubathonState }>();

	let setHours = 0;
	let setMinutes = 0;
	let setSeconds = 0;
	let setStartPaused = false;
	let rateInput = state.secondsPerCoin.toString();
	let resetHours = 1;
	let resetMinutes = 0;
	let resetSeconds = 0;
	let simulateCoinsInput = '100';

	$: syncFromState(state);
	$: formatted = formatDuration(remaining);

	function syncFromState(next: SubathonState) {
		const total = getRemaining(next);
		setHours = Math.floor(total / 3600);
		setMinutes = Math.floor((total % 3600) / 60);
		setSeconds = total % 60;
		setStartPaused = next.paused;
		rateInput = next.secondsPerCoin.toString();
		resetHours = Math.floor(next.defaultDuration / 3600);
		resetMinutes = Math.floor((next.defaultDuration % 3600) / 60);
		resetSeconds = next.defaultDuration % 60;
	}

	function emit(next: SubathonState) {
		state = next;
		dispatch('change', next);
	}

	function applyPauseToggle() {
		emit(togglePause(state));
	}

	function applySetTime() {
		const total = parseTimeInput(setHours, setMinutes, setSeconds);
		emit(setTime(state, total, { startPaused: setStartPaused }));
	}

	function applyReset() {
		emit(setTime(state, state.defaultDuration, { startPaused: false }));
		resetWarningOpen = false;
	}

	function applyRemoveTime(seconds: number) {
		emit(adjustTimeWithGain(state, -seconds));
	}

	let resetWarningOpen = false;

	function openResetWarning() {
		resetWarningOpen = true;
	}

	function cancelResetWarning() {
		resetWarningOpen = false;
	}

	function setRate(event: Event) {
		const raw = (event.currentTarget as HTMLInputElement).value;
		rateInput = raw;
		const rate = parseFloat(raw);
		if (!Number.isFinite(rate) || rate <= 0) return;
		if (rate === state.secondsPerCoin) return;
		emit({ ...state, secondsPerCoin: rate });
	}

	function applyDefaultDuration() {
		const duration = parseTimeInput(resetHours, resetMinutes, resetSeconds);
		emit({ ...state, defaultDuration: duration });
	}

	function applyAddTime(seconds: number) {
		emit(adjustTimeWithGain(state, seconds));
	}

	function simulatePaidCoins(coins: number) {
		emit(addPaidCoins(state, coins));
	}

	function applySimulateCustom() {
		const coins = parseInt(simulateCoinsInput, 10);
		if (!Number.isFinite(coins) || coins <= 0) return;
		simulatePaidCoins(coins);
	}

	function updateDisplay(patch: Partial<SubathonState['display']>) {
		emit({ ...state, display: { ...state.display, ...patch } });
	}

	function updateCoins(patch: Partial<SubathonState['coins']>) {
		emit({ ...state, coins: { ...state.coins, ...patch } });
	}

	let bitsWarningOpen = false;

	function onBitsExchangeChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const enabling = input.checked;

		if (!enabling) {
			updateCoins({ bitsExchange: false });
			return;
		}

		input.checked = false;

		if (state.coins.localPaid || state.coins.globalPaid) {
			bitsWarningOpen = true;
			return;
		}

		updateCoins({ bitsExchange: true });
	}

	function confirmBitsExchange(disableLocalPaid: boolean) {
		updateCoins({
			bitsExchange: true,
			localPaid: disableLocalPaid ? false : state.coins.localPaid
		});
		bitsWarningOpen = false;
	}

	function cancelBitsWarning() {
		bitsWarningOpen = false;
	}

	$: doubleDipRisk = state.coins.bitsExchange && state.coins.localPaid;

	function setDisplayMode(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value !== 'timer' && value !== 'bar') return;
		updateDisplay({ mode: value });
	}

	const MIN_DISPLAY_SIZE = 1;
	const MAX_DISPLAY_SIZE = 24;
	const DISPLAY_SIZE_STEP = 0.5;

	function parseDisplaySize(size: string): number {
		const match = size.trim().match(/^([\d.]+)/);
		const parsed = match ? parseFloat(match[1]) : 6;
		return Number.isFinite(parsed) ? parsed : 6;
	}

	function formatDisplaySize(value: number): string {
		const clamped = Math.min(MAX_DISPLAY_SIZE, Math.max(MIN_DISPLAY_SIZE, value));
		const rounded = Math.round(clamped * 2) / 2;
		return `${rounded}em`;
	}

	function formatDisplaySizeLabel(value: number): string {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}

	function adjustDisplaySize(delta: number) {
		const next = parseDisplaySize(state.display.size) + delta;
		updateDisplay({ size: formatDisplaySize(next) });
	}

	$: displaySizeLevel = parseDisplaySize(state.display.size);
	$: displaySizeLabel = formatDisplaySizeLabel(displaySizeLevel);

	function formatFontForDisplay(font: string): string {
		return font.replace(/\+/g, ' ');
	}

	function formatFontForStorage(font: string): string {
		return font.replace(/^ +/, '').replace(/ +/g, '+');
	}

	function setDisplayFont(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		updateDisplay({ font: formatFontForStorage(value) });
	}

	$: displayFontName = formatFontForDisplay(state.display.font);

	function setBarThreshold(
		field: 'barWarnMinutes' | 'barCriticalMinutes',
		event: Event
	) {
		const value = Math.max(0, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 0);
		updateDisplay({ [field]: value });
	}

	function setBarOpacity(event: Event) {
		const value = Math.max(0, Math.min(100, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 0));
		updateDisplay({ barOpacity: value });
	}
</script>

<div class="panel" class:compact>
	<div class="preview">
		<p class="status-line">
			{#if state.paused}
				<span class="badge paused">Paused</span>
			{:else}
				<span class="badge live">Running</span>
			{/if}
		</p>
		<p class="timer">{formatted}</p>
		<p class="meta">
			Reset returns to {formatDuration(state.defaultDuration)} · {state.secondsPerCoin === 1
				? '1 coin = 1 second'
				: `1 coin = ${state.secondsPerCoin} seconds`} · {state.display.mode}
		</p>
	</div>

	<div class="row actions">
		<button type="button" class="primary" on:click={applyPauseToggle}>
			{state.paused ? 'Resume' : 'Pause'}
		</button>
		<button type="button" class="secondary" on:click={openResetWarning}>Reset</button>
	</div>

	<div class="row actions">
		<button type="button" class="secondary" on:click={() => applyAddTime(60)}>+1 min</button>
		<button type="button" class="secondary" on:click={() => applyAddTime(300)}>+5 min</button>
		<button type="button" class="secondary" on:click={() => applyAddTime(900)}>+15 min</button>
	</div>

	<div class="row actions">
		<button type="button" class="secondary" on:click={() => applyRemoveTime(60)}>−1 min</button>
		<button type="button" class="secondary" on:click={() => applyRemoveTime(300)}>−5 min</button>
		<button type="button" class="secondary" on:click={() => applyRemoveTime(900)}>−15 min</button>
	</div>

	<fieldset>
		<legend>Set timer</legend>
		<div class="time-inputs">
			<label>
				Hours
				<input type="number" min="0" bind:value={setHours} />
			</label>
			<label>
				Minutes
				<input type="number" min="0" max="59" bind:value={setMinutes} />
			</label>
			<label>
				Seconds
				<input type="number" min="0" max="59" bind:value={setSeconds} />
			</label>
		</div>
		<label class="checkbox">
			<input type="checkbox" bind:checked={setStartPaused} />
			Start paused
		</label>
		<button type="button" class="full primary" on:click={applySetTime}>Apply time</button>
	</fieldset>

	<fieldset>
		<legend>Coin sources</legend>
		<label class="checkbox">
			<input
				type="checkbox"
				checked={state.coins.globalPaid}
				on:change={(event) =>
					updateCoins({ globalPaid: event.currentTarget.checked })}
			/>
			Paid coins (global pool)
		</label>
		<label class="checkbox">
			<input
				type="checkbox"
				checked={state.coins.localPaid}
				on:change={(event) =>
					updateCoins({ localPaid: event.currentTarget.checked })}
			/>
			Paid coins (local pool)
		</label>
		<label class="checkbox">
			<input
				type="checkbox"
				checked={state.coins.bitsExchange}
				on:change={onBitsExchangeChange}
			/>
			Twitch bits exchanged for coins
		</label>
		{#if doubleDipRisk}
			<p class="note warning">
				Bits exchange and local paid coins are both on — viewers may add time twice (once when
				bits become coins, again when those coins are spent).
			</p>
		{/if}
		<p class="note">Free coins are never counted. Only paid amounts on effect-success events.</p>
	</fieldset>

	<fieldset>
		<legend>Simulate coin spend</legend>
		<p class="note">Adds time as if paid coins were used on an effect.</p>
		<div class="row actions">
			<button type="button" class="secondary" on:click={() => simulatePaidCoins(100)}>100</button>
			<button type="button" class="secondary" on:click={() => simulatePaidCoins(500)}>500</button>
			<button type="button" class="secondary" on:click={() => simulatePaidCoins(1000)}>1000</button>
		</div>
		<label>
			Custom paid coins
			<input type="number" min="1" bind:value={simulateCoinsInput} />
		</label>
		<button type="button" class="full secondary" on:click={applySimulateCustom}>Simulate</button>
	</fieldset>

	<fieldset>
		<legend>Display</legend>
		<label>
			Layout
			<select value={state.display.mode} on:change={setDisplayMode}>
				<option value="timer">Countdown timer</option>
				<option value="bar">Status bar</option>
			</select>
		</label>
		<label>
			Label text
			<input
				type="text"
				value={state.display.text}
				on:input={(event) => updateDisplay({ text: event.currentTarget.value })}
			/>
		</label>
		<label>
			Font (Google Fonts)
			<input
				type="text"
				value={displayFontName}
				on:input={setDisplayFont}
				placeholder="Roboto Mono"
			/>
		</label>
		<p class="note font-help">
			Pick a font at
			<a
				class="help-link"
				href="https://fonts.google.com/"
				target="_blank"
				rel="noopener noreferrer"
			>fonts.google.com</a>
			and enter its name here (e.g. <code>Press Start 2P</code>).
			If the link does not open from the OBS dock, open it in your normal browser instead.
		</p>
		<label>
			Size
			<div class="size-stepper">
				<button
					type="button"
					class="secondary"
					aria-label="Decrease size"
					disabled={displaySizeLevel <= MIN_DISPLAY_SIZE}
					on:click={() => adjustDisplaySize(-DISPLAY_SIZE_STEP)}
				>
					−
				</button>
				<span class="size-value" aria-live="polite">{displaySizeLabel}</span>
				<button
					type="button"
					class="secondary"
					aria-label="Increase size"
					disabled={displaySizeLevel >= MAX_DISPLAY_SIZE}
					on:click={() => adjustDisplaySize(DISPLAY_SIZE_STEP)}
				>
					+
				</button>
			</div>
		</label>
		<label>
			Text color
			<input
				type="color"
				value={state.display.color}
				on:change={(event) => updateDisplay({ color: event.currentTarget.value })}
			/>
		</label>
		<label>
			Time added color
			<input
				type="color"
				value={state.display.gainColor}
				disabled={!state.display.showGainAnimation}
				on:change={(event) => updateDisplay({ gainColor: event.currentTarget.value })}
			/>
		</label>
		<label class="checkbox">
			<input
				type="checkbox"
				checked={state.display.showGainAnimation}
				on:change={(event) =>
					updateDisplay({ showGainAnimation: event.currentTarget.checked })}
			/>
			Show floating time animation
		</label>
		{#if state.display.mode === 'bar'}
			<p class="note">
				Bar color reflects time left: green when healthy, yellow when running low, red when
				critical.
			</p>
			<label>
				Plenty of time
				<input
					type="color"
					value={state.display.barOkColor}
					on:change={(event) => updateDisplay({ barOkColor: event.currentTarget.value })}
				/>
			</label>
			<label>
				Low time below (minutes)
				<input
					type="number"
					min="0"
					value={state.display.barWarnMinutes}
					on:input={(event) => setBarThreshold('barWarnMinutes', event)}
				/>
			</label>
			<label>
				Low time color
				<input
					type="color"
					value={state.display.barWarnColor}
					on:change={(event) => updateDisplay({ barWarnColor: event.currentTarget.value })}
				/>
			</label>
			<label>
				Critical below (minutes)
				<input
					type="number"
					min="0"
					value={state.display.barCriticalMinutes}
					on:input={(event) => setBarThreshold('barCriticalMinutes', event)}
				/>
			</label>
			<label>
				Critical color
				<input
					type="color"
					value={state.display.barCriticalColor}
					on:change={(event) => updateDisplay({ barCriticalColor: event.currentTarget.value })}
				/>
			</label>
			<label>
				Bar opacity
				<div class="bar-opacity">
					<input
						type="range"
						min="0"
						max="100"
						value={state.display.barOpacity}
						on:input={setBarOpacity}
					/>
					<span class="opacity-value">{state.display.barOpacity}%</span>
				</div>
			</label>
		{/if}
	</fieldset>

	<fieldset>
		<legend>Coin rate</legend>
		<label>
			Seconds added per coin
			<input type="number" min="0.01" step="0.01" value={rateInput} on:input={setRate} />
		</label>
		<p class="note">Default is 1 coin = 1 second. A 100-coin effect adds 100 seconds at that rate.</p>
	</fieldset>

	<fieldset>
		<legend>Reset duration</legend>
		<p class="note">
			How much time is left when you press <strong>Reset</strong>, and the starting length for a
			fresh setup. Default is 1 hour.
		</p>
		<div class="time-inputs">
			<label>
				Hours
				<input type="number" min="0" bind:value={resetHours} />
			</label>
			<label>
				Minutes
				<input type="number" min="0" max="59" bind:value={resetMinutes} />
			</label>
			<label>
				Seconds
				<input type="number" min="0" max="59" bind:value={resetSeconds} />
			</label>
		</div>
		<button type="button" class="full secondary" on:click={applyDefaultDuration}>
			Save reset duration
		</button>
	</fieldset>
</div>

{#if resetWarningOpen}
	<div class="modal-backdrop" role="presentation" on:click={cancelResetWarning} />
	<div class="modal" role="alertdialog" aria-labelledby="reset-warning-title">
		<h3 id="reset-warning-title">Reset the timer?</h3>
		<p>
			This sets the countdown back to <strong>{formatDuration(state.defaultDuration)}</strong>
			and unpauses the timer. Current progress is lost.
		</p>
		<div class="modal-actions">
			<button type="button" class="primary" on:click={applyReset}>Reset to {formatDuration(state.defaultDuration)}</button>
			<button type="button" class="linkish" on:click={cancelResetWarning}>Cancel</button>
		</div>
	</div>
{/if}

{#if bitsWarningOpen}
	<div class="modal-backdrop" role="presentation" on:click={cancelBitsWarning} />
	<div class="modal" role="alertdialog" aria-labelledby="bits-warning-title">
		<h3 id="bits-warning-title">Avoid double-counting time</h3>
		<p>
			With <strong>Twitch bits exchanged</strong> enabled, time is added when bits are converted
			into coins. If <strong>local paid coins</strong> is also on, the same value can add time
			again when those coins are spent on effects.
		</p>
		<p>Most streamers pick one source for bits — not both.</p>
		<div class="modal-actions">
			<button type="button" class="primary" on:click={() => confirmBitsExchange(true)}>
				Enable bits &amp; turn off local paid
			</button>
			<button type="button" class="secondary" on:click={() => confirmBitsExchange(false)}>
				Enable bits anyway
			</button>
			<button type="button" class="linkish" on:click={cancelBitsWarning}>Cancel</button>
		</div>
	</div>
{/if}

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	.preview {
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: #111;
		text-align: center;
	}

	.status-line {
		margin: 0 0 0.35rem;
	}

	.badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.badge.live {
		background: #1e4620;
		color: #8dff8d;
	}

	.badge.paused {
		background: #4a3618;
		color: #ffb347;
	}

	.timer {
		margin: 0;
		font-family: 'Roboto Mono', monospace;
		font-size: 1.75rem;
		font-variant-numeric: tabular-nums;
	}

	.meta,
	.note {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: #aaa;
	}

	fieldset {
		margin: 0;
		padding: 0.75rem;
		border: 1px solid #333;
		border-radius: 0.5rem;
	}

	legend {
		padding: 0 0.35rem;
		font-size: 0.85rem;
	}

	.time-inputs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
	}

	.checkbox {
		flex-direction: row;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	input[type='number'],
	input[type='text'],
	select {
		padding: 0.4rem 0.5rem;
		border: 1px solid #444;
		border-radius: 0.35rem;
		background: #0a0a0a;
		color: inherit;
		font: inherit;
	}

	input[type='color'] {
		width: 100%;
		height: 2rem;
		padding: 0;
		border: 1px solid #444;
		border-radius: 0.35rem;
		background: #0a0a0a;
	}

	.bar-opacity {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.bar-opacity input[type='range'] {
		flex: 1;
		margin: 0;
		accent-color: #8dff8d;
	}

	.opacity-value {
		flex: 0 0 2.75rem;
		font-family: 'Roboto Mono', monospace;
		font-size: 0.8rem;
		text-align: right;
		color: #aaa;
	}

	.row.actions {
		display: flex;
		gap: 0.5rem;
	}

	.size-stepper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.size-stepper button {
		flex: 0 0 2.5rem;
		padding: 0.45rem 0;
	}

	.size-value {
		flex: 1;
		text-align: center;
		font-family: 'Roboto Mono', monospace;
		font-size: 1rem;
		font-weight: 600;
	}

	button {
		padding: 0.55rem 0.75rem;
		border: none;
		border-radius: 0.35rem;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	button.primary {
		background: #5ccc5a;
		color: #111;
	}

	button.secondary {
		background: #333;
		color: #f5f5f5;
	}

	button.full {
		width: 100%;
		margin-top: 0.25rem;
	}

	button:hover {
		filter: brightness(1.08);
	}

	.row.actions button {
		flex: 1;
	}

	.note.warning {
		color: #ffb347;
	}

	.font-help code {
		font-family: 'Roboto Mono', monospace;
		font-size: 0.75rem;
	}

	.help-link {
		color: #8dff8d;
		text-decoration: underline;
	}

	.help-link:hover {
		color: #b5ffb5;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		z-index: 20;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(92vw, 24rem);
		padding: 1rem;
		border-radius: 0.6rem;
		background: #1f1f1f;
		border: 1px solid #5a4520;
		box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.45);
		z-index: 21;
	}

	.modal h3 {
		margin: 0 0 0.65rem;
		font-size: 1rem;
		color: #ffb347;
	}

	.modal p {
		margin: 0 0 0.65rem;
		font-size: 0.85rem;
		line-height: 1.45;
		color: #ddd;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.85rem;
	}

	button.linkish {
		padding: 0.35rem;
		border: none;
		background: none;
		color: #aaa;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.compact .timer {
		font-size: 1.35rem;
	}
</style>
