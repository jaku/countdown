export function fitToWidth(node: HTMLElement) {
	const update = () => {
		const bar = node.parentElement;
		const anchor = bar?.parentElement;
		if (!bar || !anchor) return;

		node.style.zoom = '1';
		bar.style.width = '';

		const barStyle = getComputedStyle(bar);
		const padX = parseFloat(barStyle.paddingLeft) + parseFloat(barStyle.paddingRight);
		const available = anchor.clientWidth;
		const needed = node.scrollWidth;
		const innerLimit = available - padX;

		if (needed > innerLimit && innerLimit > 0) {
			const scale = innerLimit / needed;
			node.style.zoom = String(scale);
			bar.style.width = `${Math.min(available, needed * scale + padX)}px`;
		}
	};

	const observer = new ResizeObserver(update);
	observer.observe(node);
	if (node.parentElement) observer.observe(node.parentElement);
	if (node.parentElement?.parentElement) observer.observe(node.parentElement.parentElement);

	update();

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
