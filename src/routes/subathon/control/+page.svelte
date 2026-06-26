<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { validateOverlayKey } from '$lib/crowdcontrol';
	import { formatDuration } from '$lib/format-duration';
	import SubathonControlPanel from '$lib/SubathonControlPanel.svelte';
	import { parseSubathonOverrides } from '$lib/subathon-url';
	import {
		clearControlKey,
		clearState,
		createInitialState,
		getRemaining,
		initOrLoadState,
		loadControlKey,
		saveControlKey,
		saveState,
		statesEqual,
		subscribeState,
		type SubathonState
	} from '$lib/subathon';

	const urlOverrides = parseSubathonOverrides($page.url.searchParams);
	const urlKey = $page.url.searchParams.get('key');

	let key: string | null = null;
	let keyInput = '';
	let validating = false;
	let authError = '';
	let state: SubathonState = createInitialState(urlOverrides);
	let remaining = 0;
	let tick = 0;

	let unsub: (() => void) | undefined;
	let interval: ReturnType<typeof setInterval> | undefined;
	let clearWarningOpen = false;

	const overlayUrl = `${$page.url.origin}/subathon`;

	function teardownSession() {
		unsub?.();
		unsub = undefined;
		if (interval) clearInterval(interval);
		interval = undefined;
	}

	function startSession(activeKey: string) {
		teardownSession();
		key = activeKey;
		state = initOrLoadState(activeKey, urlOverrides, { clear: urlOverrides.clear });
		unsub = subscribeState(activeKey, onExternalUpdate);
		interval = setInterval(() => {
			tick += 1;
		}, 1000);
	}

	function persist(next: SubathonState) {
		if (!key) return;
		state = next;
		saveState(key, next);
	}

	function onExternalUpdate(saved: SubathonState | null) {
		if (!saved || statesEqual(saved, state)) return;
		state = saved;
	}

	async function connectKey(submittedKey?: string) {
		const candidate = (submittedKey ?? keyInput).trim();
		authError = '';
		validating = true;

		const result = await validateOverlayKey(candidate);
		validating = false;

		if (!result.valid) {
			authError = result.error;
			return;
		}

		saveControlKey(candidate);
		keyInput = candidate;
		startSession(candidate);
	}

	function forgetKey() {
		teardownSession();
		key = null;
		authError = '';
		clearControlKey();
		keyInput = '';
	}

	function clearSavedState() {
		if (!key) return;
		clearState(key);
		state = initOrLoadState(key, urlOverrides);
		saveState(key, state);
		clearWarningOpen = false;
	}

	function openClearWarning() {
		clearWarningOpen = true;
	}

	function cancelClearWarning() {
		clearWarningOpen = false;
	}

	$: tick, remaining = getRemaining(state);

	onMount(async () => {
		const savedKey = loadControlKey() ?? urlKey ?? null;
		if (!savedKey) return;

		keyInput = savedKey;
		await connectKey(savedKey);
	});

	onDestroy(() => {
		teardownSession();
	});
</script>

<svelte:head>
	<title>Subathon Control</title>
	<meta property="og:title" content="Subathon Control" />
</svelte:head>

<main>
	{#if !key}
		<section class="auth">
			<h1>Subathon Control</h1>
			<p class="intro">
				Enter your Crowd Control overlay key. It is verified with Crowd Control and saved locally
				for this dock.
			</p>

			<form on:submit|preventDefault={() => connectKey()}>
				<label>
					Overlay key
					<input
						type="password"
						bind:value={keyInput}
						autocomplete="off"
						spellcheck="false"
						placeholder="Paste overlay key"
						disabled={validating}
					/>
				</label>

				{#if authError}
					<p class="error">{authError}</p>
				{/if}

				<button type="submit" class="primary" disabled={validating || !keyInput.trim()}>
					{validating ? 'Checking…' : 'Connect'}
				</button>
			</form>

			<p class="note">
				Find your overlay key in the Crowd Control app under Overlays. Connect here first, then add
				the overlay URL below as an OBS browser source.
			</p>

			<section class="help">
				<h2>Overlay URL</h2>
				<p>Uses the same saved key as this dock.</p>
				<code class="url">{overlayUrl}</code>
				<h3 class="help-subhead">OBS browser source</h3>
				<p class="note">
					The overlay keeps a live Crowd Control connection. In the browser source properties,
					<strong>uncheck “Shutdown source when not visible”</strong> so scene changes do not
					disconnect it. Leave the source active while streaming so coin events keep adding time.
				</p>
			</section>
		</section>
	{:else}
		<header>
			<div class="header-row">
				<h1>Subathon Control</h1>
				<button type="button" class="linkish" on:click={forgetKey}>Disconnect</button>
			</div>
			<p class="intro">Changes sync to the stream overlay via local storage.</p>
		</header>

		<SubathonControlPanel {state} {remaining} on:change={(event) => persist(event.detail)} />

		<section class="help">
			<h2>Overlay URL</h2>
			<p>Add this as an OBS browser source.</p>
			<code class="url">{overlayUrl}</code>
			<h3 class="help-subhead">OBS browser source</h3>
			<p class="note">
				The overlay keeps a live Crowd Control connection. In the browser source properties,
				<strong>uncheck “Shutdown source when not visible”</strong> so scene changes do not
				disconnect it. Leave the source active while streaming so coin events keep adding time.
			</p>
			<p class="note">
				Current: {formatDuration(remaining)} · Reset returns to: {formatDuration(state.defaultDuration)}
			</p>
			<div class="help-actions">
				<button type="button" class="danger" on:click={openClearWarning}>Clear saved state</button>
			</div>
		</section>
	{/if}
</main>

{#if clearWarningOpen}
	<div class="modal-backdrop" role="presentation" on:click={cancelClearWarning} />
	<div class="modal" role="alertdialog" aria-labelledby="clear-warning-title">
		<h3 id="clear-warning-title">Clear all saved state?</h3>
		<p>
			This removes everything stored for this subathon — not just the timer. Display settings,
			coin sources, rates, label text, colors, and the current countdown will all reset to
			defaults on the overlay and in this dock.
		</p>
		<p>Your connected overlay key is kept. This cannot be undone.</p>
		<div class="modal-actions">
			<button type="button" class="danger" on:click={clearSavedState}>Clear everything</button>
			<button type="button" class="secondary" on:click={cancelClearWarning}>Cancel</button>
		</div>
	</div>
{/if}

<style>
	main {
		box-sizing: border-box;
		min-height: 100vh;
		padding: 1rem;
		background: #181818;
		color: #f0f0f0;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	.auth {
		max-width: 24rem;
	}

	h1,
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	.help-subhead {
		margin: 0.85rem 0 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #ddd;
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.intro,
	.note {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: #aaa;
		line-height: 1.4;
	}

	form label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
	}

	input[type='password'] {
		padding: 0.55rem 0.65rem;
		border: 1px solid #444;
		border-radius: 0.35rem;
		background: #0a0a0a;
		color: inherit;
		font: inherit;
	}

	input[type='password']:disabled {
		opacity: 0.7;
	}

	.error {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: #ff8a8a;
	}

	button.primary {
		width: 100%;
		padding: 0.6rem 0.85rem;
		border: none;
		border-radius: 0.35rem;
		background: #5ccc5a;
		color: #111;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	button.primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	button.linkish {
		padding: 0;
		border: none;
		background: none;
		color: #8dff8d;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	button.secondary {
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 0.35rem;
		background: #333;
		color: #fff;
		font: inherit;
		cursor: pointer;
	}

	button.danger {
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: 0.35rem;
		background: #6b2d2d;
		color: #fff;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		filter: brightness(1.08);
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
		border: 1px solid #6b2d2d;
		box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.45);
		z-index: 21;
	}

	.modal h3 {
		margin: 0 0 0.65rem;
		font-size: 1rem;
		color: #ff8a8a;
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

	header {
		margin-bottom: 1rem;
	}

	.help {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid #333;
	}

	.url {
		display: block;
		margin: 0.35rem 0 0.85rem;
		padding: 0.5rem;
		border-radius: 0.35rem;
		background: #0a0a0a;
		font-size: 0.75rem;
		word-break: break-all;
	}

	.help-actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
