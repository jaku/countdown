const WSS_URL = 'wss://pubsub.crowdcontrol.live/';
const VALIDATION_TIMEOUT_MS = 8000;
const PING_AFTER_MS = 8 * 60 * 1000;
const PONG_TIMEOUT_MS = 15 * 1000;
const MAX_CONNECTION_MS = 2 * 60 * 60 * 1000;
const RECONNECT_DELAY_MS = 2000;
const OVERLAY_TOPICS = ['prv/self', 'pub/self', 'overlay/self'] as const;

export type OverlayKeyValidation = { valid: true } | { valid: false; error: string };

export type CrowdControlPubSubOptions = {
	key: string;
	topics: readonly string[];
	onMessage: (message: unknown) => void;
};

/** Long-lived PubSub connection with ping keepalive and auto-reconnect. */
export function connectCrowdControlPubSub(options: CrowdControlPubSubOptions): () => void {
	let wss: WebSocket | undefined;
	let closed = false;
	let suppressReconnect = false;
	let pingTimer: ReturnType<typeof setTimeout> | undefined;
	let pongTimer: ReturnType<typeof setTimeout> | undefined;
	let maxConnectionTimer: ReturnType<typeof setTimeout> | undefined;
	let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	let lastActivity = Date.now();

	function clearPingTimers() {
		if (pingTimer) clearTimeout(pingTimer);
		if (pongTimer) clearTimeout(pongTimer);
		pingTimer = undefined;
		pongTimer = undefined;
	}

	function schedulePing() {
		if (closed || !wss) return;
		if (pingTimer) clearTimeout(pingTimer);
		const delay = Math.max(0, PING_AFTER_MS - (Date.now() - lastActivity));
		pingTimer = setTimeout(sendPing, delay);
	}

	function sendPing() {
		pingTimer = undefined;
		if (closed || !wss || wss.readyState !== WebSocket.OPEN) return;

		wss.send(JSON.stringify({ action: 'ping' }));
		lastActivity = Date.now();

		if (pongTimer) clearTimeout(pongTimer);
		pongTimer = setTimeout(() => {
			pongTimer = undefined;
			reconnect();
		}, PONG_TIMEOUT_MS);
	}

	function touchActivity() {
		lastActivity = Date.now();
		schedulePing();
	}

	function subscribe() {
		if (!wss || wss.readyState !== WebSocket.OPEN) return;

		wss.send(
			JSON.stringify({
				action: 'subscribe',
				data: JSON.stringify({
					key: options.key,
					topics: [...options.topics]
				})
			})
		);
		touchActivity();
	}

	function scheduleReconnect() {
		if (closed || reconnectTimer) return;

		reconnectTimer = setTimeout(() => {
			reconnectTimer = undefined;
			if (!closed) open();
		}, RECONNECT_DELAY_MS);
	}

	function reconnect() {
		suppressReconnect = true;
		teardownSocket();
		suppressReconnect = false;
		if (!closed) scheduleReconnect();
	}

	function teardownSocket() {
		clearPingTimers();
		if (maxConnectionTimer) {
			clearTimeout(maxConnectionTimer);
			maxConnectionTimer = undefined;
		}

		const socket = wss;
		wss = undefined;
		socket?.close();
	}

	function onOpen() {
		subscribe();
		if (maxConnectionTimer) clearTimeout(maxConnectionTimer);
		maxConnectionTimer = setTimeout(() => reconnect(), MAX_CONNECTION_MS);
		schedulePing();
	}

	function onMessage(event: MessageEvent) {
		const { data } = event;
		if (typeof data !== 'string') return;

		if (data === 'pong') {
			if (pongTimer) {
				clearTimeout(pongTimer);
				pongTimer = undefined;
			}
			touchActivity();
			return;
		}

		try {
			options.onMessage(JSON.parse(data));
			touchActivity();
		} catch {
			// ignore malformed messages
		}
	}

	function onClose() {
		wss = undefined;
		clearPingTimers();
		if (maxConnectionTimer) {
			clearTimeout(maxConnectionTimer);
			maxConnectionTimer = undefined;
		}
		if (!closed && !suppressReconnect) scheduleReconnect();
	}

	function attachSocket(socket: WebSocket) {
		wss = socket;
		socket.addEventListener('open', onOpen);
		socket.addEventListener('message', onMessage);
		socket.addEventListener('close', onClose);
		socket.addEventListener('error', onClose);
	}

	function open() {
		if (closed) return;

		try {
			attachSocket(new WebSocket(WSS_URL));
		} catch {
			scheduleReconnect();
		}
	}

	open();

	return () => {
		closed = true;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		suppressReconnect = true;
		teardownSocket();
	};
}

export function validateOverlayKey(key: string): Promise<OverlayKeyValidation> {
	const trimmed = key.trim();
	if (!trimmed) {
		return Promise.resolve({ valid: false, error: 'Enter your overlay key.' });
	}

	return new Promise((resolve) => {
		let settled = false;

		const finish = (result: OverlayKeyValidation) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			wss.close();
			resolve(result);
		};

		let wss: WebSocket;
		try {
			wss = new WebSocket(WSS_URL);
		} catch {
			resolve({ valid: false, error: 'Could not connect to Crowd Control.' });
			return;
		}

		const timeout = setTimeout(() => {
			finish({ valid: false, error: 'Timed out. Check your key and try again.' });
		}, VALIDATION_TIMEOUT_MS);

		wss.addEventListener('open', () => {
			wss.send(
				JSON.stringify({
					action: 'subscribe',
					data: JSON.stringify({
						key: trimmed,
						topics: [...OVERLAY_TOPICS]
					})
				})
			);
		});

		wss.addEventListener('message', (event) => {
			const { data } = event;
			if (typeof data !== 'string' || data === 'pong') return;

			try {
				const message = JSON.parse(data);
				if (message.domain !== 'direct' || message.type !== 'subscription-result') return;

				const success: string[] = message.payload?.success ?? [];
				const failure: string[] = message.payload?.failure ?? [];
				const accepted = OVERLAY_TOPICS.some((topic) => success.includes(topic));

				if (accepted) {
					finish({ valid: true });
				} else if (failure.length > 0) {
					finish({ valid: false, error: 'Invalid overlay key.' });
				}
			} catch {
				// ignore malformed messages
			}
		});

		wss.addEventListener('error', () => {
			finish({ valid: false, error: 'Could not connect to Crowd Control.' });
		});

		wss.addEventListener('close', () => {
			if (!settled) {
				finish({
					valid: false,
					error: 'Connection closed before the key could be verified.'
				});
			}
		});
	});
}
