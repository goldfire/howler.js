import { setupAudioContext } from "./helpers/audio-context";
import { loadBuffer } from "./helpers/audio-loader";
import { isAppleVendor } from "./helpers/light-ua-parser";
import { Howler } from "./howler.core";
import { globalPluginManager } from "./plugins/plugin";
import { Sound } from "./sound";
import {
	type AudioBufferSourceNodeWithLegacy,
	cache,
	type EventListener,
	type HowlOptions,
	type HTMLAudioElementWithUnlocked,
	isGainNode,
	isHTMLAudioElement,
	type QueueItem
} from "./types";

class Howl {
	_autoplay: boolean = false;
	_format: string[] = [];
	_html5: boolean = false;
	_muted: boolean = false;
	_loop: boolean = false;
	_pool: number = 5;
	_preload: boolean | "metadata" = true;
	_rate: number = 1;
	_sprite: Record<string, [number, number, boolean?]> = {};
	_src: string | string[] = [];
	_volume: number = 1;
	_xhr: {
		method: string;
		headers?: HeadersInit;
		withCredentials: boolean;
	} = { method: "GET", withCredentials: false };
	_duration: number = 0;
	_state: string = "unloaded";
	_sounds: Sound[] = [];
	_endTimers: Record<number, ReturnType<typeof setTimeout>> = {};
	_queue: QueueItem[] = [];
	_playLock: boolean = false;
	_webAudio: boolean = false;
	_onend: EventListener[] = [];
	_onfade: EventListener[] = [];
	_onload: EventListener[] = [];
	_onloaderror: EventListener[] = [];
	_onplayerror: EventListener[] = [];
	_onpause: EventListener[] = [];
	_onplay: EventListener[] = [];
	_onstop: EventListener[] = [];
	_onmute: EventListener[] = [];
	_onvolume: EventListener[] = [];
	_onrate: EventListener[] = [];
	_onseek: EventListener[] = [];
	_onunlock: EventListener[] = [];
	_onresume: EventListener[] = [];

	constructor(o: HowlOptions) {
		if (!o.src || o.src.length === 0) {
			console.error(
				"An array of source files must be passed with any new Howl.",
			);
			return;
		}

		this.init(o);
	}

	init(o: HowlOptions): Howl {
		if (!Howler.ctx) {
			setupAudioContext();
		}

		this._autoplay = o.autoplay || false;
		this._format = typeof o.format !== "string" ? o.format || [] : [o.format];
		this._html5 = o.html5 || false;
		this._muted = o.mute || false;
		this._loop = o.loop || false;
		this._pool = o.pool || 5;
		this._preload =
			typeof o.preload === "boolean" || o.preload === "metadata"
				? o.preload
				: true;
		this._rate = o.rate || 1;
		this._sprite = o.sprite || {};
		this._src = typeof o.src !== "string" ? o.src : [o.src];
		this._volume = o.volume !== undefined ? o.volume : 1;
		this._xhr = {
			method: o.xhr && o.xhr.method ? o.xhr.method : "GET",
			headers: o.xhr && o.xhr.headers ? o.xhr.headers : undefined,
			withCredentials:
				o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
		};

		this._duration = 0;
		this._state = "unloaded";
		this._sounds = [];
		this._endTimers = {};
		this._queue = [];
		this._playLock = false;

		this._onend = o.onend ? [{ fn: o.onend }] : [];
		this._onfade = o.onfade ? [{ fn: o.onfade }] : [];
		this._onload = o.onload ? [{ fn: o.onload }] : [];
		this._onloaderror = o.onloaderror
			? [
					{
						fn: (...args: unknown[]) => {
							if (
								o.onloaderror &&
								typeof args[0] === "number" &&
								typeof args[1] === "string"
							) {
								o.onloaderror(args[0], args[1]);
							}
						},
					},
				]
			: [];
		this._onplayerror = o.onplayerror
			? [
					{
						fn: (...args: unknown[]) => {
							if (
								o.onplayerror &&
								typeof args[0] === "number" &&
								typeof args[1] === "string"
							) {
								o.onplayerror(args[0], args[1]);
							}
						},
					},
				]
			: [];
		this._onpause = o.onpause ? [{ fn: o.onpause }] : [];
		this._onplay = o.onplay ? [{ fn: o.onplay }] : [];
		this._onstop = o.onstop ? [{ fn: o.onstop }] : [];
		this._onmute = o.onmute ? [{ fn: o.onmute }] : [];
		this._onvolume = o.onvolume ? [{ fn: o.onvolume }] : [];
		this._onrate = o.onrate ? [{ fn: o.onrate }] : [];
		this._onseek = o.onseek ? [{ fn: o.onseek }] : [];
		this._onunlock = o.onunlock ? [{ fn: o.onunlock }] : [];
		this._onresume = [];

		this._webAudio = Howler.usingWebAudio && !this._html5;

		if (typeof Howler.ctx !== "undefined" && Howler.ctx && Howler.autoUnlock) {
			Howler._unlockAudio();
		}

		Howler._howls.push(this);

		// Execute plugin hooks
		globalPluginManager.executeHowlCreate(this, o);

		if (this._autoplay) {
			this._queue.push({
				event: "play",
				action: () => {
					this.play();
				},
			});
		}

		if (this._preload === true || this._preload === "metadata") {
			this.load();
		}

		return this;
	}

	load(): Howl {
		let url: string | null = null;

		if (Howler.noAudio) {
			this._emit("loaderror", null, "No audio support.");
			return this;
		}

		if (typeof this._src === "string") {
			this._src = [this._src];
		}

		for (let i = 0; i < (this._src as string[]).length; i++) {
			let ext: string | null;
			const str = (this._src as string[])[i];

			if (this._format && this._format[i]) {
				ext = this._format[i];
			} else {
				if (typeof str !== "string") {
					this._emit(
						"loaderror",
						null,
						"Non-string found in selected audio sources - ignoring.",
					);
					continue;
				}

				let extMatch = /^data:audio\/([^;,]+);/i.exec(str);
				if (!extMatch) {
					extMatch = /\.([^.]+)$/.exec(str.split("?", 1)[0]);
				}

				ext = extMatch ? extMatch[1].toLowerCase() : null;
			}

			if (!ext) {
				console.warn(
					'No file extension was found. Consider using the "format" property or specify an extension.',
				);
			}

			if (ext && Howler.codecs(ext)) {
				url = (this._src as string[])[i];
				break;
			}
		}

		if (!url) {
			this._emit(
				"loaderror",
				null,
				"No codec support for selected audio sources.",
			);
			return this;
		}

		this._src = url;
		this._state = "loading";

		if (
			typeof window !== "undefined" &&
			window.location.protocol === "https:" &&
			url.slice(0, 5) === "http:"
		) {
			this._html5 = true;
			this._webAudio = false;
		}

		new Sound(this);

		if (this._webAudio) {
			loadBuffer(this);
		}

		return this;
	}

	play(sprite?: string | number, internal?: boolean): number | null {
		let id: number | null = null;

		if (typeof sprite === "number") {
			id = sprite;
			sprite = undefined;
		} else if (
			typeof sprite === "string" &&
			this._state === "loaded" &&
			!this._sprite[sprite]
		) {
			return null;
		} else if (typeof sprite === "undefined") {
			sprite = "__default";

			if (!this._playLock) {
				let num = 0;
				for (let i = 0; i < this._sounds.length; i++) {
					if (this._sounds[i]._paused && !this._sounds[i]._ended) {
						num++;
						id = this._sounds[i]._id;
					}
				}

				if (num === 1) {
					sprite = undefined;
				} else {
					id = null;
				}
			}
		}

		const sound = id ? this._soundById(id) : this._inactiveSound();

		if (!sound) {
			return null;
		}

		if (id && !sprite) {
			sprite = sound._sprite || "__default";
		}

		if (this._state !== "loaded") {
			sound._sprite = sprite || "__default";
			sound._ended = false;

			const soundId = sound._id;
			this._queue.push({
				event: "play",
				action: () => {
					this.play(soundId);
				},
			});

			return soundId;
		}

		if (id && !sound._paused) {
			if (!internal) {
				this._loadQueue("play");
			}

			return sound._id;
		}

		if (this._webAudio) {
			Howler._autoResume();
		}

		const seek = Math.max(
			0,
			sound._seek > 0 ? sound._seek : this._sprite[sprite!][0] / 1000,
		);
		const duration = Math.max(
			0,
			(this._sprite[sprite!][0] + this._sprite[sprite!][1]) / 1000 - seek,
		);
		const timeout = (duration * 1000) / Math.abs(sound._rate);
		const start = this._sprite[sprite!][0] / 1000;
		const stop = (this._sprite[sprite!][0] + this._sprite[sprite!][1]) / 1000;
		sound._sprite = sprite!;

		sound._ended = false;

		const setParams = () => {
			sound._paused = false;
			sound._seek = seek;
			sound._start = start;
			sound._stop = stop;
			sound._loop = !!(sound._loop || this._sprite[sprite!][2]);
		};

		if (seek >= stop) {
			this._ended(sound);
			return sound._id;
		}

		const node = sound._node;

		if (this._webAudio && node && isGainNode(node)) {
			const playWebAudio = () => {
				this._playLock = false;
				setParams();
				this._refreshBuffer(sound);

				const vol = sound._muted || this._muted ? 0 : sound._volume;
				node.gain.setValueAtTime(vol, Howler.ctx!.currentTime);
				sound._playStart = Howler.ctx!.currentTime;

				if (node.bufferSource) {
					node.bufferSource.start(0, seek, sound._loop ? 86400 : duration);
				}

				if (timeout !== Infinity) {
					this._endTimers[sound._id] = setTimeout(
						this._ended.bind(this, sound),
						timeout,
					);
				}

				if (!internal) {
					setTimeout(() => {
						this._emit("play", sound._id);
						this._loadQueue();
					}, 0);
				}
			};

			if (Howler.state === "running" && Howler.ctx!.state !== "interrupted") {
				playWebAudio();
			} else {
				this._playLock = true;
				this.once("resume", playWebAudio);
				this._clearTimer(sound._id);
			}
		} else if (node && isHTMLAudioElement(node)) {
			const playHtml5 = () => {
				node.currentTime = seek;
				node.muted = sound._muted || this._muted || Howler._muted || node.muted;
				const volume = Howler.volume();
				node.volume = sound._volume * (typeof volume === "number" ? volume : 1);
				node.playbackRate = sound._rate;

				try {
					const play = node.play();

					if (
						play &&
						typeof Promise !== "undefined" &&
						(play instanceof Promise ||
							typeof (play as any).then === "function")
					) {
						this._playLock = true;

						setParams();

						(play as any)
							.then(() => {
								this._playLock = false;
								if ("_unlocked" in node) {
									(node as HTMLAudioElementWithUnlocked)._unlocked = true;
								}
								if (!internal) {
									this._emit("play", sound._id);
								} else {
									this._loadQueue();
								}
							})
							.catch(() => {
								this._playLock = false;
								this._emit(
									"playerror",
									sound._id,
									"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.",
								);
								sound._ended = true;
								sound._paused = true;
							});
					} else if (!internal) {
						this._playLock = false;
						setParams();
						this._emit("play", sound._id);
					}

					node.playbackRate = sound._rate;

					if (node.paused) {
						this._emit(
							"playerror",
							sound._id,
							"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.",
						);
						return;
					}

					if (sprite !== "__default" || sound._loop) {
						this._endTimers[sound._id] = setTimeout(
							this._ended.bind(this, sound),
							timeout,
						);
					} else {
						const endHandler = () => {
							this._ended(sound);
							node.removeEventListener("ended", endHandler, false);
						};
						this._endTimers[sound._id] = setTimeout(endHandler, timeout);
						node.addEventListener("ended", endHandler, false);
					}
				} catch (err: unknown) {
					this._emit(
						"playerror",
						sound._id,
						err instanceof Error ? err.message : String(err),
					);
				}
			};

			if (
				node.src ===
				"data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
			) {
				const src =
					typeof this._src === "string"
						? this._src
						: Array.isArray(this._src) && this._src.length > 0
							? this._src[0]
							: "";
				node.src = src;
				node.load();
			}

			const loadedNoReadyState = false;
			if (node.readyState >= 3 || loadedNoReadyState) {
				playHtml5();
			} else {
				this._playLock = true;
				this._state = "loading";

				const listener = () => {
					this._state = "loaded";
					playHtml5();
					node.removeEventListener(Howler._canPlayEvent, listener, false);
				};
				node.addEventListener(Howler._canPlayEvent, listener, false);

				this._clearTimer(sound._id);
			}
		}

		return sound._id;
	}

	pause(id?: number, internal?: boolean): Howl {
		if (this._state !== "loaded" || this._playLock) {
			this._queue.push({
				event: "pause",
				action: () => {
					this.pause(id);
				},
			});

			return this;
		}

		const ids = this._getSoundIds(id);

		for (let i = 0; i < ids.length; i++) {
			this._clearTimer(ids[i]);

			const sound = this._soundById(ids[i]);

			if (sound && !sound._paused) {
				const seekResult = this.seek(ids[i]);
				sound._seek = typeof seekResult === "number" ? seekResult : 0;
				sound._rateSeek = 0;
				sound._paused = true;

				this._stopFade(ids[i]);

				if (sound._node) {
					if (this._webAudio && isGainNode(sound._node)) {
						if (!sound._node.bufferSource) {
							continue;
						}

						sound._node.bufferSource.stop(0);

						this._cleanBuffer(sound._node);
					} else if (
						isHTMLAudioElement(sound._node) &&
						(!isNaN(sound._node.duration) || sound._node.duration === Infinity)
					) {
						sound._node.pause();
					}
				}
			}

			if (!arguments[1]) {
				this._emit("pause", sound ? sound._id : null);
			}
		}

		return this;
	}

	stop(id?: number, internal?: boolean): Howl {
		if (this._state !== "loaded" || this._playLock) {
			this._queue.push({
				event: "stop",
				action: () => {
					this.stop(id);
				},
			});

			return this;
		}

		const ids = this._getSoundIds(id);

		for (let i = 0; i < ids.length; i++) {
			this._clearTimer(ids[i]);

			const sound = this._soundById(ids[i]);

			if (sound) {
				sound._seek = sound._start || 0;
				sound._rateSeek = 0;
				sound._paused = true;
				sound._ended = true;

				this._stopFade(ids[i]);

				if (sound._node) {
					if (this._webAudio && isGainNode(sound._node)) {
						if (sound._node.bufferSource) {
							sound._node.bufferSource.stop(0);

							this._cleanBuffer(sound._node);
						}
					} else if (
						isHTMLAudioElement(sound._node) &&
						(!isNaN(sound._node.duration) || sound._node.duration === Infinity)
					) {
						sound._node.currentTime = sound._start || 0;
						sound._node.pause();

						if (sound._node.duration === Infinity) {
							this._clearSound(sound._node);
						}
					}
				}

				if (!internal) {
					this._emit("stop", sound._id);
				}
			}
		}

		return this;
	}

	mute(muted: boolean, id?: number): boolean | Howl {
		if (this._state !== "loaded" || this._playLock) {
			this._queue.push({
				event: "mute",
				action: () => {
					this.mute(muted, id);
				},
			});

			return this;
		}

		if (typeof id === "undefined") {
			if (typeof muted === "boolean") {
				this._muted = muted;
			} else {
				return this._muted;
			}
		}

		const ids = this._getSoundIds(id);

		for (let i = 0; i < ids.length; i++) {
			const sound = this._soundById(ids[i]);

			if (sound) {
				sound._muted = muted;

				if (sound._interval) {
					this._stopFade(sound._id);
				}

				if (this._webAudio && sound._node && isGainNode(sound._node)) {
					sound._node.gain.setValueAtTime(
						muted ? 0 : sound._volume,
						Howler.ctx!.currentTime,
					);
				} else if (sound._node && isHTMLAudioElement(sound._node)) {
					sound._node.muted = Howler._muted ? true : muted;
				}

				this._emit("mute", sound._id);
			}
		}

		return this;
	}

	volume(): number;
	volume(vol: number): Howl;
	volume(vol: number, id: number): Howl;
	volume(vol: number, id: number, internal: boolean): Howl;
	volume(vol?: number): number | Howl {
		const args = arguments;
		let volume: number | undefined;
		let id: number | undefined;

		if (args.length === 0) {
			return this._volume;
		} else if (
			args.length === 1 ||
			(args.length === 2 && typeof args[1] === "undefined")
		) {
			const ids = this._getSoundIds();
			const index = ids.indexOf(args[0] as number);
			if (index >= 0) {
				id = parseInt(String(args[0]), 10);
			} else {
				volume = parseFloat(String(args[0]));
			}
		} else if (args.length >= 2) {
			volume = parseFloat(String(args[0]));
			id = parseInt(String(args[1]), 10);
		}

		let sound: Sound | null = null;
		if (typeof volume !== "undefined" && volume >= 0 && volume <= 1) {
			if (this._state !== "loaded" || this._playLock) {
				this._queue.push({
					event: "volume",
					action: () => {
						if (args.length >= 1 && typeof args[0] === "number") {
							if (args.length >= 2 && typeof args[1] === "number") {
								this.volume(args[0], args[1]);
							} else {
								this.volume(args[0]);
							}
						}
					},
				});

				return this;
			}

			if (typeof id === "undefined") {
				this._volume = volume;
			}

			const soundIds = this._getSoundIds(id);
			for (let i = 0; i < soundIds.length; i++) {
				sound = this._soundById(soundIds[i]);

				if (sound) {
					sound._volume = volume;

					if (!args[2]) {
						this._stopFade(soundIds[i]);
					}

					if (
						this._webAudio &&
						sound._node &&
						isGainNode(sound._node) &&
						!sound._muted
					) {
						sound._node.gain.setValueAtTime(volume, Howler.ctx!.currentTime);
					} else if (
						sound._node &&
						isHTMLAudioElement(sound._node) &&
						!sound._muted
					) {
						const volumeMultiplierOrGlobal = Howler.volume();
						if (typeof volumeMultiplierOrGlobal === "number") {
							sound._node.volume = volume * volumeMultiplierOrGlobal;
						}
					}

					this._emit("volume", sound._id);
				}
			}
		} else {
			sound = id ? this._soundById(id) : this._sounds[0];
			return sound ? sound._volume : 0;
		}

		return this;
	}

	fade(from: number, to: number, len: number, id?: number): Howl {
		if (this._state !== "loaded" || this._playLock) {
			this._queue.push({
				event: "fade",
				action: () => {
					this.fade(from, to, len, id);
				},
			});

			return this;
		}

		from = Math.min(Math.max(0, parseFloat(String(from))), 1);
		to = Math.min(Math.max(0, parseFloat(String(to))), 1);
		len = parseFloat(String(len));

		if (typeof id !== "undefined") {
			this.volume(from, id);
		} else {
			this.volume(from);
		}

		const ids = this._getSoundIds(id);
		for (let i = 0; i < ids.length; i++) {
			const sound = this._soundById(ids[i]);

			if (sound) {
				if (!id) {
					this._stopFade(ids[i]);
				}

				if (this._webAudio && !sound._muted) {
					const currentTime = Howler.ctx!.currentTime;
					const end = currentTime + len / 1000;
					sound._volume = from;
					if (sound._node && isGainNode(sound._node)) {
						sound._node.gain.setValueAtTime(from, currentTime);
						sound._node.gain.linearRampToValueAtTime(to, end);
					}
				}

				this._startFadeInterval(
					sound,
					from,
					to,
					len,
					ids[i],
					typeof id === "undefined",
				);
			}
		}

		return this;
	}

	_startFadeInterval(
		sound: Sound,
		from: number,
		to: number,
		len: number,
		id: number,
		isGroup: boolean,
	): void {
		let vol = from;
		const diff = to - from;
		const steps = Math.abs(diff / 0.01);
		const stepLen = Math.max(4, steps > 0 ? len / steps : len);
		let lastTick = Date.now();

		sound._fadeTo = to;

		sound._interval = setInterval(() => {
			const tick = (Date.now() - lastTick) / len;
			lastTick = Date.now();
			vol += diff * tick;

			vol = Math.round(vol * 100) / 100;

			if (diff < 0) {
				vol = Math.max(to, vol);
			} else {
				vol = Math.min(to, vol);
			}

			if (this._webAudio) {
				sound._volume = vol;
			} else {
				this.volume(vol, sound._id, true);
			}

			if (isGroup) {
				this._volume = vol;
			}

			if ((to < from && vol <= to) || (to > from && vol >= to)) {
				if (sound._interval) {
					clearInterval(sound._interval);
				}
				sound._interval = undefined;
				sound._fadeTo = undefined;
				this.volume(to, sound._id);
				this._emit("fade", sound._id);
			}
		}, stepLen);
	}

	_stopFade(id: number): Howl {
		const sound = this._soundById(id);

		if (sound && sound._interval) {
			if (this._webAudio && sound._node && isGainNode(sound._node)) {
				sound._node.gain.cancelScheduledValues(Howler.ctx!.currentTime);
			}

			if (sound._interval) {
				clearInterval(sound._interval);
				sound._interval = undefined;
			}
			this.volume(sound._fadeTo as number, id);
			sound._fadeTo = undefined;
			this._emit("fade", id);
		}

		return this;
	}

	loop(): boolean;
	loop(loop: boolean): Howl;
	loop(loop?: boolean): boolean | Howl {
		const args = arguments;
		let loopVal: boolean | undefined;
		let id: number | undefined;
		let sound: Sound | null = null;

		if (args.length === 0) {
			return this._loop;
		} else if (args.length === 1) {
			if (typeof args[0] === "boolean") {
				loopVal = args[0] as boolean;
				this._loop = loopVal;
			} else {
				sound = this._soundById(parseInt(String(args[0]), 10));
				return sound ? sound._loop : false;
			}
		} else if (args.length === 2) {
			loopVal = args[0] as boolean;
			id = parseInt(String(args[1]), 10);
		}

		const ids = this._getSoundIds(id);
		for (let i = 0; i < ids.length; i++) {
			sound = this._soundById(ids[i]);

			if (sound) {
				sound._loop = loopVal as boolean;
				if (
					this._webAudio &&
					sound._node &&
					isGainNode(sound._node) &&
					sound._node.bufferSource
				) {
					sound._node.bufferSource.loop = loopVal;
					if (loopVal) {
						sound._node.bufferSource.loopStart = sound._start || 0;
						sound._node.bufferSource.loopEnd = sound._stop;

						if (this.playing(ids[i])) {
							this.pause(ids[i], true);
							this.play(ids[i], true);
						}
					}
				}
			}
		}

		return this;
	}

	rate(): number;
	rate(rate: number): Howl;
	rate(rate: number, id: number): Howl;
	rate(rate?: number): number | Howl {
		const args = arguments;
		let rateVal: number | undefined;
		let id: number | undefined;

		if (args.length === 0) {
			id = this._sounds[0]._id;
		} else if (args.length === 1) {
			const ids = this._getSoundIds();
			const index = ids.indexOf(args[0] as number);
			if (index >= 0) {
				id = parseInt(String(args[0]), 10);
			} else {
				rateVal = parseFloat(String(args[0]));
			}
		} else if (args.length === 2) {
			rateVal = parseFloat(String(args[0]));
			id = parseInt(String(args[1]), 10);
		}

		let sound: Sound | null = null;
		if (typeof rateVal === "number") {
			if (this._state !== "loaded" || this._playLock) {
				this._queue.push({
					event: "rate",
					action: () => {
						if (args.length >= 1 && typeof args[0] === "number") {
							if (args.length >= 2 && typeof args[1] === "number") {
								this.rate(args[0], args[1]);
							} else {
								this.rate(args[0]);
							}
						}
					},
				});

				return this;
			}

			if (typeof id === "undefined") {
				this._rate = rateVal;
			}

			const soundIds = this._getSoundIds(id);
			for (let i = 0; i < soundIds.length; i++) {
				sound = this._soundById(soundIds[i]);

				if (sound) {
					if (this.playing(soundIds[i])) {
						const seekResult = this.seek(soundIds[i]);
						sound._rateSeek = typeof seekResult === "number" ? seekResult : 0;
						sound._playStart = this._webAudio
							? Howler.ctx!.currentTime
							: sound._playStart;
					}
					sound._rate = rateVal;

					if (
						this._webAudio &&
						sound._node &&
						isGainNode(sound._node) &&
						sound._node.bufferSource
					) {
						sound._node.bufferSource.playbackRate.setValueAtTime(
							rateVal,
							Howler.ctx!.currentTime,
						);
					} else if (sound._node && isHTMLAudioElement(sound._node)) {
						sound._node.playbackRate = rateVal;
					}

					const seekResult = this.seek(soundIds[i]);
					const seek = typeof seekResult === "number" ? seekResult : 0;
					const duration =
						(this._sprite[sound._sprite][0] + this._sprite[sound._sprite][1]) /
							1000 -
						seek;
					const timeout = (duration * 1000) / Math.abs(sound._rate);

					if (this._endTimers[soundIds[i]] || !sound._paused) {
						this._clearTimer(soundIds[i]);
						this._endTimers[soundIds[i]] = setTimeout(
							this._ended.bind(this, sound),
							timeout,
						);
					}

					this._emit("rate", sound._id);
				}
			}
		} else {
			if (typeof id !== "undefined") {
				sound = this._soundById(id);
				return sound ? sound._rate : this._rate;
			}
			return this._rate;
		}

		return this;
	}

	seek(): number;
	seek(seek: number): Howl;
	seek(seek: number, id: number): Howl;
	seek(seek?: number): number | Howl {
		const args = arguments;
		let seekVal: number | undefined;
		let id: number | undefined;

		if (args.length === 0) {
			if (this._sounds.length) {
				id = this._sounds[0]._id;
			}
		} else if (args.length === 1) {
			const ids = this._getSoundIds();
			const index = ids.indexOf(args[0] as number);
			if (index >= 0) {
				id = parseInt(String(args[0]), 10);
			} else if (this._sounds.length) {
				id = this._sounds[0]._id;
				seekVal = parseFloat(String(args[0]));
			}
		} else if (args.length === 2) {
			seekVal = parseFloat(String(args[0]));
			id = parseInt(String(args[1]), 10);
		}

		if (typeof id === "undefined") {
			return 0;
		}

		if (
			typeof seekVal === "number" &&
			(this._state !== "loaded" || this._playLock)
		) {
			this._queue.push({
				event: "seek",
				action: () => {
					if (args.length >= 1 && typeof args[0] === "number") {
						if (args.length >= 2 && typeof args[1] === "number") {
							this.seek(args[0], args[1]);
						} else {
							this.seek(args[0]);
						}
					}
				},
			});

			return this;
		}

		const sound = this._soundById(id);

		if (sound) {
			if (typeof seekVal === "number" && seekVal >= 0) {
				const playing = this.playing(id);
				if (playing) {
					this.pause(id, true);
				}

				sound._seek = seekVal;
				sound._ended = false;
				this._clearTimer(id);

				if (
					!this._webAudio &&
					sound._node &&
					isHTMLAudioElement(sound._node) &&
					!isNaN(sound._node.duration)
				) {
					sound._node.currentTime = seekVal;
				}

				const seekAndEmit = () => {
					if (playing) {
						this.play(id, true);
					}

					this._emit("seek", id);
				};

				if (playing && !this._webAudio) {
					const emitSeek = () => {
						if (!this._playLock) {
							seekAndEmit();
						} else {
							setTimeout(emitSeek, 0);
						}
					};
					setTimeout(emitSeek, 0);
				} else {
					seekAndEmit();
				}
			} else {
				if (this._webAudio) {
					const realTime = this.playing(id)
						? Howler.ctx!.currentTime - sound._playStart
						: 0;
					const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
					return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
				} else if (sound._node && isHTMLAudioElement(sound._node)) {
					return sound._node.currentTime;
				}
				return 0;
			}
		}

		return this;
	}

	playing(id?: number): boolean {
		if (typeof id === "number") {
			const sound = this._soundById(id);
			return sound ? !sound._paused : false;
		}

		for (let i = 0; i < this._sounds.length; i++) {
			if (!this._sounds[i]._paused) {
				return true;
			}
		}

		return false;
	}

	duration(id?: number): number {
		let duration = this._duration;

		if (typeof id !== "undefined") {
			const sound = this._soundById(id);
			if (sound) {
				duration = this._sprite[sound._sprite][1] / 1000;
			}
		}

		return duration;
	}

	state(): string {
		return this._state;
	}

	unload(): null {
		// Execute plugin hooks before destruction
		globalPluginManager.executeHowlDestroy(this);

		const sounds = this._sounds;
		for (let i = 0; i < sounds.length; i++) {
			if (!sounds[i]._paused) {
				this.stop(sounds[i]._id);
			}

			const node = sounds[i]._node;
			if (!this._webAudio && node && isHTMLAudioElement(node)) {
				this._clearSound(node);

				const errorFn = sounds[i]._errorFn;
				if (errorFn) {
					node.removeEventListener("error", errorFn, false);
				}
				const loadFn = sounds[i]._loadFn;
				if (loadFn) {
					node.removeEventListener(
						Howler._canPlayEvent as string,
						loadFn,
						false,
					);
				}
				const endFn = sounds[i]._endFn;
				if (endFn) {
					node.removeEventListener("ended", endFn, false);
				}

				Howler._releaseHtml5Audio(node);
			}

			sounds[i]._node = null;

			this._clearTimer(sounds[i]._id);
		}

		const index = Howler._howls.indexOf(this);
		if (index >= 0) {
			Howler._howls.splice(index, 1);
		}

		let remCache = true;
		for (let i = 0; i < Howler._howls.length; i++) {
			if (
				Howler._howls[i]._src === this._src ||
				(this._src as string).indexOf(Howler._howls[i]._src as string) >= 0
			) {
				remCache = false;
				break;
			}
		}

		if (cache && remCache) {
			delete cache[this._src as string];
		}

		Howler.noAudio = false;

		this._state = "unloaded";
		this._sounds = [];

		return null;
	}

	on(
		event: string,
		fn: (...args: unknown[]) => void,
		id?: number,
		once?: boolean,
	): Howl {
		const events = (this as unknown as Record<string, EventListener[]>)[
			`_on${event}`
		];

		if (typeof fn === "function") {
			events.push(once ? { id, fn, once } : { id, fn });
		}

		return this;
	}

	off(event: string, fn?: (...args: unknown[]) => void, id?: number): Howl {
		const events = (this as unknown as Record<string, EventListener[]>)[
			`_on${event}`
		];
		let i = 0;

		if (typeof fn === "number") {
			id = fn;
			fn = undefined;
		}

		if (fn || id) {
			for (i = 0; i < events.length; i++) {
				const isId = id === events[i].id;
				if ((fn === events[i].fn && isId) || (!fn && isId)) {
					events.splice(i, 1);
					break;
				}
			}
		} else if (event) {
			(this as unknown as Record<string, EventListener[]>)[`_on${event}`] = [];
		} else {
			const keys = Object.keys(this);
			for (i = 0; i < keys.length; i++) {
				if (
					keys[i].indexOf("_on") === 0 &&
					Array.isArray(
						(this as unknown as Record<string, EventListener[]>)[keys[i]],
					)
				) {
					(this as unknown as Record<string, EventListener[]>)[keys[i]] = [];
				}
			}
		}

		return this;
	}

	once(event: string, fn: (...args: unknown[]) => void, id?: number): Howl {
		this.on(event, fn, id, true);

		return this;
	}

	_emit(event: string, id?: number | null, msg?: string): Howl {
		const events = (this as unknown as Record<string, EventListener[]>)[
			`_on${event}`
		];

		for (let i = events.length - 1; i >= 0; i--) {
			if (!events[i].id || events[i].id === id || event === "load") {
				const fn = events[i].fn;
				setTimeout(() => {
					fn(id, msg);
				}, 0);

				if (events[i].once) {
					this.off(event, events[i].fn, events[i].id);
				}
			}
		}

		this._loadQueue(event);

		return this;
	}

	_loadQueue(event?: string): Howl {
		if (this._queue.length > 0) {
			const task = this._queue[0];

			if (task.event === event) {
				this._queue.shift();
				this._loadQueue();
			}

			if (!event) {
				task.action();
			}
		}

		return this;
	}

	_ended(sound: Sound): Howl {
		const sprite = sound._sprite;

		if (
			!this._webAudio &&
			sound._node &&
			isHTMLAudioElement(sound._node) &&
			!sound._node.paused &&
			!sound._node.ended &&
			sound._node.currentTime < sound._stop!
		) {
			setTimeout(this._ended.bind(this, sound), 100);
			return this;
		}

		const loop = !!(sound._loop || this._sprite[sprite][2]);

		this._emit("end", sound._id);

		if (!this._webAudio && loop) {
			this.stop(sound._id, true).play(sound._id);
		}

		if (this._webAudio && loop) {
			this._emit("play", sound._id);
			sound._seek = sound._start || 0;
			sound._rateSeek = 0;
			sound._playStart = Howler.ctx!.currentTime;

			const timeout =
				((sound._stop! - (sound._start || 0)) * 1000) / Math.abs(sound._rate);
			this._endTimers[sound._id] = setTimeout(
				this._ended.bind(this, sound),
				timeout,
			);
		}

		if (this._webAudio && !loop) {
			sound._paused = true;
			sound._ended = true;
			sound._seek = sound._start || 0;
			sound._rateSeek = 0;
			this._clearTimer(sound._id);

			this._cleanBuffer(sound._node);

			Howler._autoSuspend();
		}

		if (!this._webAudio && !loop) {
			this.stop(sound._id, true);
		}

		return this;
	}

	_clearTimer(id: number): Howl {
		if (this._endTimers[id]) {
			if (typeof this._endTimers[id] !== "function") {
				clearTimeout(this._endTimers[id]);
			} else {
				const sound = this._soundById(id);
				if (sound && sound._node) {
					sound._node.removeEventListener("ended", this._endTimers[id], false);
				}
			}

			delete this._endTimers[id];
		}

		return this;
	}

	_soundById(id: number): Sound | null {
		for (let i = 0; i < this._sounds.length; i++) {
			if (id === this._sounds[i]._id) {
				return this._sounds[i];
			}
		}

		return null;
	}

	_inactiveSound(): Sound {
		this._drain();

		for (let i = 0; i < this._sounds.length; i++) {
			if (this._sounds[i]._ended) {
				return this._sounds[i].reset();
			}
		}

		return new Sound(this);
	}

	_drain(): void {
		const limit = this._pool;
		let cnt = 0;

		if (this._sounds.length < limit) {
			return;
		}

		for (let i = 0; i < this._sounds.length; i++) {
			if (this._sounds[i]._ended) {
				cnt++;
			}
		}

		for (let i = this._sounds.length - 1; i >= 0; i--) {
			if (cnt <= limit) {
				return;
			}

			if (this._sounds[i]._ended) {
				const node = this._sounds[i]._node;
				if (this._webAudio && node && isGainNode(node)) {
					node.disconnect(0);
				}

				this._sounds.splice(i, 1);
				cnt--;
			}
		}
	}

	_getSoundIds(id?: number): number[] {
		if (typeof id === "undefined") {
			const ids: number[] = [];
			for (let i = 0; i < this._sounds.length; i++) {
				ids.push(this._sounds[i]._id);
			}

			return ids;
		} else {
			return [id];
		}
	}

	_refreshBuffer(sound: Sound): Howl {
		if (!sound._node || !isGainNode(sound._node) || !Howler.ctx) {
			return this;
		}

		sound._node.bufferSource =
			Howler.ctx.createBufferSource() as AudioBufferSourceNodeWithLegacy;
		const src =
			typeof this._src === "string"
				? this._src
				: Array.isArray(this._src) && this._src.length > 0
					? this._src[0]
					: "";
		sound._node.bufferSource.buffer = cache[src];

		if (sound._panner) {
			sound._node.bufferSource.connect(sound._panner);
		} else {
			sound._node.bufferSource.connect(sound._node);
		}

		sound._node.bufferSource.loop = sound._loop;
		if (sound._loop) {
			sound._node.bufferSource.loopStart = sound._start || 0;
			sound._node.bufferSource.loopEnd = sound._stop || 0;
		}
		sound._node.bufferSource.playbackRate.setValueAtTime(
			sound._rate,
			Howler.ctx.currentTime,
		);

		return this;
	}

	_cleanBuffer(node: any): Howl {
		const isIOS = isAppleVendor(Howler._navigator);

		if (!node.bufferSource) {
			return this;
		}

		if (Howler._scratchBuffer && node.bufferSource) {
			node.bufferSource.onended = null;
			node.bufferSource.disconnect(0);
			if (isIOS) {
				try {
					node.bufferSource.buffer = Howler._scratchBuffer;
				} catch (e) {}
			}
		}
		node.bufferSource = null;

		return this;
	}

	_clearSound(node: HTMLAudioElementWithUnlocked): void {
		node.src =
			"data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
	}
}
export { Howl };
