<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { formatGainLabel } from '$lib/format-gain';

	export let gain: { seconds: number; nonce: number } | undefined = undefined;
	export let color = '#9dff9d';

	interface FloatItem {
		id: number;
		text: string;
		x: number;
		drift: number;
		lift: number;
		duration: number;
		scale: number;
		rotation: number;
		delay: number;
	}

	let items: FloatItem[] = [];
	let nextId = 0;
	let lastNonce = -1;
	let ready = false;

	onMount(() => {
		lastNonce = gain?.nonce ?? -1;
		ready = true;
	});

	$: if (ready && gain && gain.nonce !== lastNonce && gain.seconds !== 0) {
		const { seconds, nonce } = gain;
		lastNonce = nonce;
		void enqueueSpawn(seconds);
	}

	async function enqueueSpawn(seconds: number) {
		await tick();
		spawn(seconds);
	}

	function itemStyle(item: FloatItem): string {
		return [
			`--x: ${item.x}vw`,
			`--drift: ${item.drift}px`,
			`--lift: ${item.lift}px`,
			`--duration: ${item.duration}s`,
			`--delay: ${item.delay}s`,
			`--scale: ${item.scale}`,
			`--rotation: ${item.rotation}deg`,
			`--gain-color: ${color}`,
			`--gain-glow: color-mix(in srgb, ${color} 55%, transparent)`
		].join('; ');
	}

	function spawn(seconds: number) {
		const text = formatGainLabel(seconds);
		const item: FloatItem = {
			id: nextId++,
			text,
			x: (Math.random() - 0.5) * 18,
			drift: (Math.random() - 0.5) * 160,
			lift: 80 + Math.random() * 70,
			duration: 1.8 + Math.random() * 1.2,
			scale: 0.9 + Math.random() * 0.35,
			rotation: (Math.random() - 0.5) * 20,
			delay: Math.random() * 0.2
		};

		items = [...items, item];

		setTimeout(() => {
			items = items.filter((entry) => entry.id !== item.id);
		}, (item.duration + item.delay) * 1000 + 200);
	}
</script>

<div class="float-layer" aria-hidden="true">
	{#each items as item (item.id)}
		<span class="float-item" style={itemStyle(item)}>
			{item.text}
		</span>
	{/each}
</div>

<style>
	.float-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: visible;
		z-index: 1000;
	}

	.float-item {
		position: absolute;
		left: calc(50% + var(--x));
		top: 50%;
		color: var(--gain-color);
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: clamp(1.1rem, 2.8vw, 2rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: 0.01em;
		white-space: nowrap;
		text-shadow:
			0 0 4px rgba(0, 0, 0, 1),
			0 0 10px rgba(0, 0, 0, 0.85),
			0 2px 12px var(--gain-glow);
		animation: float-up var(--duration) ease-out var(--delay) forwards;
		opacity: 0;
		will-change: transform, opacity;
	}

	@keyframes float-up {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(calc(var(--scale) * 0.65)) rotate(var(--rotation));
		}

		15% {
			opacity: 1;
		}

		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--drift)), calc(-50% - var(--lift)))
				scale(var(--scale)) rotate(calc(var(--rotation) * 0.4));
		}
	}
</style>
