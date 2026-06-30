<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import SubathonOverlayDisplay from '$lib/SubathonOverlayDisplay.svelte';
	import FloatingTimeGains from '$lib/FloatingTimeGains.svelte';
	import { connectCrowdControlPubSub } from '$lib/crowdcontrol';
	import { parseSubathonOverrides } from '$lib/subathon-url';
	import {
		addCoinGain,
		addPaidCoins,
		bitsExchangeToSeconds,
		commitState,
		createInitialState,
		effectDisplayName,
		effectPaidCoins,
		getRemaining,
		initOrLoadState,
		loadControlKey,
		logEffectSuccess,
		saveState,
		statesEqual,
		subscribeControlKey,
		subscribeState,
		type SubathonState
	} from '$lib/subathon';

	const urlOverrides = parseSubathonOverrides($page.url.searchParams);
	const urlKey = $page.url.searchParams.get('key');

	let key: string | null = null;
	let disconnectSocket: (() => void) | undefined;
	let tick = 0;
	let remaining = 0;

	let state: SubathonState = createInitialState(urlOverrides);

	let unsubState: (() => void) | undefined;
	let unsubKey: (() => void) | undefined;
	let interval: ReturnType<typeof setInterval> | undefined;

	function teardownSession() {
		unsubState?.();
		unsubState = undefined;
		if (interval) clearInterval(interval);
		interval = undefined;

		disconnectSocket?.();
		disconnectSocket = undefined;
	}

	function persist(update: (base: SubathonState) => SubathonState) {
		if (!key) return;
		state = commitState(key, state, update);
	}

	function onExternalUpdate(saved: SubathonState | null) {
		if (!saved || statesEqual(saved, state)) return;
		state = saved;
	}

	function onPubSubMessage(message: unknown) {
		const msg = message as {
			domain?: string;
			type?: string;
			payload?: {
				amount?: number;
				effect?: { name?: string | { public?: string; sort?: string } };
				payments?: {
					global: { free: number; paid: number };
					local: { free: number; paid: number };
				};
			};
		};
		if (msg.domain !== 'prv') return;

		if (msg.type === 'coin-exchange') {
			persist((prev) => {
				if (!prev.coins.bitsExchange) return prev;
				const added = bitsExchangeToSeconds(msg.payload?.amount ?? 0, prev);
				if (added <= 0) return prev;
				return addCoinGain(prev, added);
			});
		} else if (msg.type === 'effect-success' && msg.payload?.payments) {
			const payments = msg.payload.payments;
			const effectName = effectDisplayName(msg.payload.effect);

			persist((prev) => {
				logEffectSuccess(effectName, payments, prev.coins, prev.secondsPerCoin);

				const paid = effectPaidCoins(payments, prev.coins);
				if (paid <= 0) return prev;
				return addPaidCoins(prev, paid);
			});
		}
	}

	function connectSocket() {
		if (!key) return;

		disconnectSocket?.();
		disconnectSocket = connectCrowdControlPubSub({
			key,
			topics: ['prv/self', 'pub/self', 'overlay/self'],
			onMessage: onPubSubMessage
		});
	}

	function startSession(activeKey: string) {
		teardownSession();
		key = activeKey;
		state = initOrLoadState(activeKey, urlOverrides, { clear: urlOverrides.clear });
		unsubState = subscribeState(activeKey, onExternalUpdate);
		connectSocket();
		interval = setInterval(() => {
			tick += 1;
		}, 1000);
	}

	function onControlKeyChange(nextKey: string | null) {
		const trimmed = nextKey?.trim() || null;
		if (trimmed === key) return;

		if (!trimmed) {
			teardownSession();
			key = null;
			state = createInitialState(urlOverrides);
			return;
		}

		startSession(trimmed);
	}

	$: tick, remaining = getRemaining(state);
	$: fontParam = state.display.font;
	$: coinGain = state.lastCoinGain;

	onMount(() => {
		const savedKey = loadControlKey() ?? urlKey?.trim() ?? null;
		if (savedKey) startSession(savedKey);
		unsubKey = subscribeControlKey(onControlKeyChange);
	});

	onDestroy(() => {
		unsubKey?.();
		teardownSession();
	});
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/css2?family={fontParam}&display=swap" rel="stylesheet" />
	<title>Subathon Timer</title>
	<meta property="og:title" content="Subathon Timer" />
</svelte:head>

<main>
	{#if !key}
		<p class="message">Connect in the Subathon Control dock first.</p>
	{:else}
		<SubathonOverlayDisplay {state} {remaining} />
		{#if state.display.showGainAnimation}
			<FloatingTimeGains gain={coinGain} color={state.display.gainColor} />
		{/if}
	{/if}
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		height: 100vh;
		width: 100vw;
		margin: 0;
		padding: 0;
		overflow: visible;
		background: transparent;
	}

	.message {
		margin: 0;
		max-width: 16em;
		font-size: 1rem;
		line-height: 1.4;
		color: #ccc;
	}
</style>
