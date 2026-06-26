const WSS_URL = 'wss://pubsub.crowdcontrol.live/';
const VALIDATION_TIMEOUT_MS = 8000;
const OVERLAY_TOPICS = ['prv/self', 'pub/self', 'overlay/self'] as const;

export type OverlayKeyValidation = { valid: true } | { valid: false; error: string };

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
