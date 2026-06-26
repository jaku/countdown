<script lang="ts">
	import { decomposeDuration } from '$lib/format-duration';

	export let remaining = 0;
	export let compact = false;

	$: parts = decomposeDuration(remaining);
</script>

<div
	class="duration"
	class:compact
	aria-label={parts.map((part) => `${part.value} ${part.unit}`).join(', ')}
>
	{#each parts as part (`${part.unit}-${part.value.length}`)}
		<span class="duration-part" data-unit={part.unit} data-digits={part.value.length}>
			<span class="duration-value">{part.value}</span><span class="duration-unit">{part.unit}</span>
		</span>
	{/each}
</div>

<style>
	.duration {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.06em 0.14em;
		line-height: 1.1;
	}

	.duration.compact {
		flex-wrap: nowrap;
		gap: 0.04em 0.1em;
	}

	.duration-part {
		display: inline-flex;
		align-items: baseline;
		white-space: nowrap;
		flex: 0 0 auto;
	}

	.duration-value {
		display: inline-block;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.duration-part[data-digits='1'] .duration-value {
		min-width: 1.1ch;
	}

	.duration-part[data-digits='2'] .duration-value {
		min-width: 2.1ch;
	}

	.duration-part[data-digits='3'] .duration-value {
		min-width: 3.1ch;
	}

	.duration-unit {
		margin-left: 0.02em;
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 0.48em;
		font-weight: 700;
		letter-spacing: 0.02em;
		opacity: 0.85;
		flex: 0 0 auto;
	}
</style>
