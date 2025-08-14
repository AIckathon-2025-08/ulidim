// Centralized music control for Two Truths and a Lie
// Non-breaking extraction from main.js

export const musicService = {
	audioEl: null,
	enabled: true,

	init(audioElement) {
		this.audioEl = audioElement;
	},

	isEnabled() {
		return this.enabled;
	},

	setEnabled(enabled) {
		this.enabled = !!enabled;
		this.updateButtons();
		if (!this.enabled) {
			this.stop();
		}
	},

	// Start music if enabled; optionally override src
	start(src) {
		if (!this.audioEl || !this.enabled) return;
		if (src) {
			this.audioEl.src = src;
		}
		const playPromise = this.audioEl.play();
		if (playPromise && typeof playPromise.catch === 'function') {
			playPromise.catch(() => {
				// Fallback: wait for first user interaction
				document.addEventListener(
					'click',
					() => {
						if (this.enabled && this.audioEl && this.audioEl.paused) {
							this.audioEl.play().catch(() => {});
						}
					},
					{ once: true }
				);
			});
		}
	},

	stop() {
		if (this.audioEl && !this.audioEl.paused) {
			this.audioEl.pause();
		}
	},

	toggle() {
		this.setEnabled(!this.enabled);
		return this.enabled;
	},

	updateButtons() {
		const buttons = document.querySelectorAll('.music-toggle-btn');
		buttons.forEach((btn) => {
			btn.textContent = this.enabled ? '🔊 Music On' : '🔇 Music Off';
		});
	},

	// Only plays on voting/results pages
	maybeStartForPage(pageName, customSrc) {
		if (pageName === 'voting' || pageName === 'results') {
			this.start(customSrc);
		} else {
			this.stop();
		}
	},
};
