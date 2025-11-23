/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

// Import helper functions directly for better tree-shaking
import { setupAudioContext } from "./helpers/audio-context";
import type { Howl } from "./howl";
// Import plugin manager
import { globalPluginManager, type HowlerPlugin } from "./plugins/plugin";
import {
  type HTMLAudioElementWithUnlocked,
  isHTMLAudioElement,
  type NavigatorWithCocoonJS,
  type WindowWithAudio,
} from "./types";

export class HowlerGlobal {
	_counter: number = 1000;
	_html5AudioPool: HTMLAudioElement[] = [];
	html5PoolSize: number = 10;
	_codecs: Record<string, boolean> = {};
	_howls: Howl[] = [];
	_muted: boolean = false;
	_volume: number = 1;
	_canPlayEvent: string = "canplaythrough";
	_navigator: NavigatorWithCocoonJS | null = null;
	masterGain: GainNode | null = null;
	noAudio: boolean = false;
	usingWebAudio: boolean = true;
	autoSuspend: boolean = true;
	ctx: AudioContext | null = null;
	autoUnlock: boolean = true;
	state: string = "suspended";
	_audioUnlocked: boolean = false;
	_scratchBuffer: AudioBuffer | null = null;
	_suspendTimer: ReturnType<typeof setTimeout> | null = null;
	_resumeAfterSuspend?: boolean;
	_mobileUnloaded?: boolean;

	constructor() {
		// Initialize all properties (explicit initialization ensures correct values)
		this._counter = 1000;
		this._html5AudioPool = [];
		this.html5PoolSize = 10;
		this._codecs = {};
		this._howls = [];
		this._muted = false;
		this._volume = 1;
		this._canPlayEvent = "canplaythrough";
		this._navigator =
			typeof window !== "undefined" && window.navigator
				? window.navigator
				: null;
		this.masterGain = null;
		this.noAudio = false;
		this.usingWebAudio = true;
		this.autoSuspend = true;
		this.ctx = null;
		this.autoUnlock = true;

		// Setup Howler (codecs, audio context, etc.)
		this._setup();

		// Register the Howler instance with the plugin manager
		// This triggers onHowlerInit hooks for any plugins already registered
		globalPluginManager.setHowlerInstance(this);
	}

	volume(vol?: number): number | HowlerGlobal {
		if (vol !== undefined) {
			vol = parseFloat(String(vol));

			if (!this.ctx) {
				setupAudioContext();
			}

			if (typeof vol === "number" && vol >= 0 && vol <= 1) {
				this._volume = vol;

				if (this._muted) {
					return this;
				}

				if (this.usingWebAudio && this.ctx) {
					this.masterGain!.gain.setValueAtTime(vol, this.ctx.currentTime);
				}

				for (let i = 0; i < this._howls.length; i++) {
					if (!this._howls[i]._webAudio) {
						const ids = this._howls[i]._getSoundIds();
						for (let j = 0; j < ids.length; j++) {
							const sound = this._howls[i]._soundById(ids[j]);
							if (sound && sound._node && isHTMLAudioElement(sound._node)) {
								sound._node.volume = sound._volume * vol;
							}
						}
					}
				}

				return this;
			}
		}

		return this._volume;
	}

	mute(muted: boolean): HowlerGlobal {
		if (!this.ctx) {
			setupAudioContext();
		}

		this._muted = muted;

		if (this.usingWebAudio && this.ctx) {
			this.masterGain!.gain.setValueAtTime(
				muted ? 0 : this._volume,
				this.ctx.currentTime,
			);
		}

		for (let i = 0; i < this._howls.length; i++) {
			if (!this._howls[i]._webAudio) {
				const ids = this._howls[i]._getSoundIds();
				for (let j = 0; j < ids.length; j++) {
					const sound = this._howls[i]._soundById(ids[j]);
					if (sound && sound._node && isHTMLAudioElement(sound._node)) {
						sound._node.muted = muted ? true : sound._muted;
					}
				}
			}
		}

		return this;
	}

	stop(): HowlerGlobal {
		for (let i = 0; i < this._howls.length; i++) {
			this._howls[i].stop();
		}

		return this;
	}

	unload(): HowlerGlobal {
		for (let i = this._howls.length - 1; i >= 0; i--) {
			this._howls[i].unload();
		}

		if (
			this.usingWebAudio &&
			this.ctx &&
			typeof this.ctx.close !== "undefined"
		) {
			this.ctx.close();
			this.ctx = null;
			setupAudioContext();
		}

		return this;
	}

	codecs(ext: string): boolean {
		return this._codecs[ext.replace(/^x-/, "")];
	}

	/**
	 * Register a plugin with Howler
	 * @param plugin - The plugin to register
	 * @returns this for chaining
	 * @throws Error if a plugin with the same name is already registered
	 */
	addPlugin(plugin: HowlerPlugin): HowlerGlobal {
		globalPluginManager.register(plugin);
		return this;
	}

	/**
	 * Unregister a plugin from Howler
	 * @param plugin - The plugin instance to unregister
	 * @returns this for chaining
	 * @throws Error if the plugin is not registered
	 */
	removePlugin(plugin: HowlerPlugin): HowlerGlobal {
		globalPluginManager.unregister(plugin.name);
		return this;
	}

	/**
	 * Check if a plugin is registered
	 * @param pluginName - The name of the plugin to check
	 * @returns true if the plugin is registered, false otherwise
	 */
	hasPlugin(pluginName: string): boolean {
		return globalPluginManager.isRegistered(pluginName);
	}

	_setup(): HowlerGlobal {
		this.state = this.ctx ? this.ctx.state || "suspended" : "suspended";
		this._autoSuspend();

		if (!this.usingWebAudio) {
			if (typeof window.Audio !== "undefined") {
				try {
					const test = new window.Audio();
					if (typeof test.oncanplaythrough === "undefined") {
						this._canPlayEvent = "canplay";
					}
				} catch (e) {
					this.noAudio = true;
				}
			} else {
				this.noAudio = true;
			}
		}

		try {
			const test = new window.Audio();
			if (test.muted) {
				this.noAudio = true;
			}
		} catch (e) {}

		if (!this.noAudio) {
			this._setupCodecs();
		}

		return this;
	}

	_setupCodecs(): HowlerGlobal {
		let audioTest: HTMLAudioElement | null = null;

		try {
			audioTest =
				typeof window.Audio !== "undefined" ? new window.Audio() : null;
		} catch (err) {
			return this;
		}

		if (!audioTest || typeof audioTest.canPlayType !== "function") {
			return this;
		}

		const mpegTest = audioTest.canPlayType("audio/mpeg;").replace(/^no$/, "");

		this._codecs = {
			mp3: !!(
				mpegTest || audioTest.canPlayType("audio/mp3;").replace(/^no$/, "")
			),
			mpeg: !!mpegTest,
			opus: !!audioTest
				.canPlayType('audio/ogg; codecs="opus"')
				.replace(/^no$/, ""),
			ogg: !!audioTest
				.canPlayType('audio/ogg; codecs="vorbis"')
				.replace(/^no$/, ""),
			oga: !!audioTest
				.canPlayType('audio/ogg; codecs="vorbis"')
				.replace(/^no$/, ""),
			wav: !!(
				audioTest.canPlayType('audio/wav; codecs="1"') ||
				audioTest.canPlayType("audio/wav")
			).replace(/^no$/, ""),
			aac: !!audioTest.canPlayType("audio/aac;").replace(/^no$/, ""),
			caf: !!audioTest.canPlayType("audio/x-caf;").replace(/^no$/, ""),
			m4a: !!(
				audioTest.canPlayType("audio/x-m4a;") ||
				audioTest.canPlayType("audio/m4a;") ||
				audioTest.canPlayType("audio/aac;")
			).replace(/^no$/, ""),
			m4b: !!(
				audioTest.canPlayType("audio/x-m4b;") ||
				audioTest.canPlayType("audio/m4b;") ||
				audioTest.canPlayType("audio/aac;")
			).replace(/^no$/, ""),
			mp4: !!(
				audioTest.canPlayType("audio/x-mp4;") ||
				audioTest.canPlayType("audio/mp4;") ||
				audioTest.canPlayType("audio/aac;")
			).replace(/^no$/, ""),
			weba: !!audioTest
				.canPlayType('audio/webm; codecs="vorbis"')
				.replace(/^no$/, ""),
			webm: !!audioTest
				.canPlayType('audio/webm; codecs="vorbis"')
				.replace(/^no$/, ""),
			dolby: !!audioTest
				.canPlayType('audio/mp4; codecs="ec-3"')
				.replace(/^no$/, ""),
			flac: !!(
				audioTest.canPlayType("audio/x-flac;") ||
				audioTest.canPlayType("audio/flac;")
			).replace(/^no$/, ""),
		};

		return this;
	}

	_unlockAudio(): void {
		if (this._audioUnlocked || !this.ctx) {
			return;
		}

		this._audioUnlocked = false;
		this.autoUnlock = false;

		if (!this._mobileUnloaded && this.ctx.sampleRate !== 44100) {
			this._mobileUnloaded = true;
			this.unload();
		}

		this._scratchBuffer = this.ctx.createBuffer(1, 1, 22050);

		const unlock = () => {
			while (this._html5AudioPool.length < this.html5PoolSize) {
				try {
					const audioNode = new (
						window as WindowWithAudio
					).Audio() as HTMLAudioElementWithUnlocked;
					audioNode._unlocked = true;
					this._releaseHtml5Audio(audioNode);
				} catch (e) {
					this.noAudio = true;
					break;
				}
			}

			for (let i = 0; i < this._howls.length; i++) {
				if (!this._howls[i]._webAudio) {
					const ids = this._howls[i]._getSoundIds();
					for (let j = 0; j < ids.length; j++) {
						const sound = this._howls[i]._soundById(ids[j]);
						if (
							sound &&
							sound._node &&
							isHTMLAudioElement(sound._node) &&
							!sound._node._unlocked
						) {
							sound._node._unlocked = true;
							sound._node.load();
						}
					}
				}
			}

			this._autoResume();

			const source = this.ctx!.createBufferSource();
			source.buffer = this._scratchBuffer;
			source.connect(this.ctx!.destination);
			source.start(0);

			if (typeof this.ctx!.resume === "function") {
				this.ctx!.resume();
			}

			source.onended = () => {
				source.disconnect(0);
				this._audioUnlocked = true;

				document.removeEventListener("touchstart", unlock, true);
				document.removeEventListener("touchend", unlock, true);
				document.removeEventListener("click", unlock, true);
				document.removeEventListener("keydown", unlock, true);

				for (let i = 0; i < this._howls.length; i++) {
					this._howls[i]._emit("unlock");
				}
			};
		};

		document.addEventListener("touchstart", unlock, true);
		document.addEventListener("touchend", unlock, true);
		document.addEventListener("click", unlock, true);
		document.addEventListener("keydown", unlock, true);
	}

	_obtainHtml5Audio(): HTMLAudioElementWithUnlocked {
		if (this._html5AudioPool.length) {
			return this._html5AudioPool.pop()!;
		}

		const testPlay = new (window as WindowWithAudio).Audio().play();
		if (testPlay && typeof Promise !== "undefined") {
			if (testPlay instanceof Promise) {
				testPlay.catch(() => {
					console.warn(
						"HTML5 Audio pool exhausted, returning potentially locked audio object.",
					);
				});
			} else if (
				typeof testPlay === "object" &&
				testPlay !== null &&
				"then" in testPlay &&
				typeof (testPlay as { then?: unknown }).then === "function"
			) {
				// Handle thenable objects
				(testPlay as { catch: (onRejected: () => void) => void }).catch(() => {
					console.warn(
						"HTML5 Audio pool exhausted, returning potentially locked audio object.",
					);
				});
			}
		}

		return new (
			window as WindowWithAudio
		).Audio() as HTMLAudioElementWithUnlocked;
	}

	_releaseHtml5Audio(audio: HTMLAudioElementWithUnlocked): HowlerGlobal {
		if (audio._unlocked) {
			this._html5AudioPool.push(audio);
		}

		return this;
	}

	_autoSuspend(): void {
		if (
			!this.autoSuspend ||
			!this.ctx ||
			typeof this.ctx.suspend === "undefined" ||
			!this.usingWebAudio
		) {
			return;
		}

		for (let i = 0; i < this._howls.length; i++) {
			if (this._howls[i]._webAudio) {
				for (let j = 0; j < this._howls[i]._sounds.length; j++) {
					if (!this._howls[i]._sounds[j]._paused) {
						return;
					}
				}
			}
		}

		if (this._suspendTimer) {
			clearTimeout(this._suspendTimer);
		}

		this._suspendTimer = setTimeout(() => {
			if (!this.autoSuspend) {
				return;
			}

			this._suspendTimer = null;
			this.state = "suspending";

			const handleSuspension = () => {
				this.state = "suspended";

				if (this._resumeAfterSuspend) {
					delete this._resumeAfterSuspend;
					this._autoResume();
				}
			};

			this.ctx!.suspend().then(handleSuspension, handleSuspension);
		}, 30000);
	}

	_autoResume(): void {
		if (
			!this.ctx ||
			typeof this.ctx.resume === "undefined" ||
			!this.usingWebAudio
		) {
			return;
		}

		if (
			this.state === "running" &&
			this.ctx.state !== "interrupted" &&
			this._suspendTimer
		) {
			clearTimeout(this._suspendTimer);
			this._suspendTimer = null;
		} else if (
			this.state === "suspended" ||
			(this.state === "running" && this.ctx.state === "interrupted")
		) {
			this.ctx.resume().then(() => {
				this.state = "running";

				for (let i = 0; i < this._howls.length; i++) {
					this._howls[i]._emit("resume");
				}
			});

			if (this._suspendTimer) {
				clearTimeout(this._suspendTimer);
				this._suspendTimer = null;
			}
		} else if (this.state === "suspending") {
			this._resumeAfterSuspend = true;
		}
	}
}
