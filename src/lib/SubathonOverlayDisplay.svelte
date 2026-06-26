<script lang="ts">
	import DurationDisplay from '$lib/DurationDisplay.svelte';
	import { fitToWidth } from '$lib/fit-to-width';
	import { getBarStatusBackground, type SubathonState } from '$lib/subathon';

	export let state: SubathonState;
	export let remaining = 0;

	$: fontFamily = `'${state.display.font.replace(/\+/g, ' ')}', monospace`;
	$: barColor = getBarStatusBackground(state, remaining);
</script>

<div class="overlay-root" class:paused={state.paused}>
	{#if state.display.mode === 'bar'}
		<div class="bar-layout" style="font-size: {state.display.size}; color: {state.display.color};">
			{#if state.display.text}
				<p class="label">{state.display.text}</p>
			{/if}
			<div class="bar-anchor">
				<div
					class="bar-status"
					style="background: {barColor}; font-family: {fontFamily};"
				>
					<div class="bar-status-inner" use:fitToWidth>
						<DurationDisplay {remaining} compact />
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="timer-layout" style="font-size: {state.display.size}; color: {state.display.color};">
			{#if state.display.text}
				<p class="label">{state.display.text}</p>
			{/if}
			<div class="timer-anchor" style="font-family: {fontFamily};">
				<DurationDisplay {remaining} />
			</div>
		</div>
	{/if}
</div>

<style>
	.overlay-root {
		position: relative;
		overflow: visible;
		transition: filter 0.35s ease;
	}

	.overlay-root.paused {
		filter: grayscale(1);
	}

	.timer-layout,
	.bar-layout {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25em;
		width: min(96vw, 56rem);
		overflow: visible;
	}

	.timer-anchor,
	.bar-anchor {
		position: relative;
		width: 100%;
		overflow: visible;
		display: flex;
		justify-content: center;
	}

	.label {
		margin: 0;
		font-size: 0.35em;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.bar-status {
		width: fit-content;
		max-width: 100%;
		margin: 0 auto;
		padding: 0.22em 0.85em;
		border-radius: 0.2em;
		transition: background-color 0.6s ease;
		filter: drop-shadow(0 0 0.08em rgba(0, 0, 0, 0.8));
		box-sizing: border-box;
		overflow: hidden;
	}

	.bar-status-inner {
		display: inline-block;
		max-width: 100%;
	}
</style>
