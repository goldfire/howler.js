// Import Howler singleton from howler.core.ts
import { type Howl, Howler } from "./howler.core";
import { globalPluginManager } from "./plugins/plugin";
import {
	type GainNodeWithBufferSource,
	type HTMLAudioElementWithUnlocked,
	isHTMLAudioElement,
} from "./types";

export class Sound {
	_parent: Howl;
	_muted: boolean = false;
	_loop: boolean = false;
	_volume: number = 1;
	_rate: number = 1;
	_seek: number = 0;
	_paused: boolean = true;
	_ended: boolean = true;
	_sprite: string = "__default";
	_id: number = 0;
	_node: HTMLAudioElementWithUnlocked | GainNodeWithBufferSource | null = null;
	_playStart: number = 0;
	_rateSeek: number = 0;
	_errorFn?: (event: Event) => void;
	_loadFn?: (event: Event) => void;
	_endFn?: (event: Event) => void;
	_start?: number;
	_stop?: number;
	_panner?: PannerNode | StereoPannerNode;
	_fadeTo?: number;
	_interval?: ReturnType<typeof setInterval>;

	constructor(howl: Howl) {
		this._parent = howl;
		this.init();
	}

	init(): Sound {
		const parent = this._parent;

		this._muted = parent._muted;
		this._loop = parent._loop;
		this._volume = parent._volume;
		this._rate = parent._rate;
		this._seek = 0;
		this._paused = true;
		this._ended = true;
		this._sprite = "__default";

		this._id = ++Howler._counter;

		parent._sounds.push(this);

		this.create();

		// Execute plugin hooks
		globalPluginManager.executeSoundCreate(this, parent);

		return this;
	}

	create(): Sound {
		const parent = this._parent;
		const volume =
			Howler._muted || this._muted || parent._muted ? 0 : this._volume;

		this._errorFn = this._errorListener.bind(this);
		this._loadFn = this._loadListener.bind(this);
		this._endFn = this._endListener.bind(this);

		if (parent._webAudio && Howler.ctx) {
			const gainNode = Howler.ctx.createGain();
			if (gainNode) {
				this._node = gainNode as GainNodeWithBufferSource;
				this._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
				(this._node as { paused?: boolean }).paused = true;
				this._node.connect(Howler.masterGain!);
			}
		} else if (!Howler.noAudio) {
			this._node = Howler._obtainHtml5Audio();

			this._errorFn = this._errorListener.bind(this);
			this._node.addEventListener("error", this._errorFn, false);

			this._loadFn = this._loadListener.bind(this);
			this._node.addEventListener(Howler._canPlayEvent, this._loadFn, false);

			this._endFn = this._endListener.bind(this);
			this._node.addEventListener("ended", this._endFn, false);

			const src =
				typeof parent._src === "string"
					? parent._src
					: Array.isArray(parent._src) && parent._src.length > 0
						? parent._src[0]
						: "";
			this._node.src = src;
			const preloadValue =
				parent._preload === true
					? "auto"
					: parent._preload === false
						? "none"
						: parent._preload === "metadata"
							? "metadata"
							: "auto";
			this._node.preload = preloadValue;
			const volumeOrHowler = Howler.volume();
			if (typeof volumeOrHowler === "number") {
				this._node.volume = volume * volumeOrHowler;
			}

			this._node.load();
		}

		return this;
	}

	reset(): Sound {
		const parent = this._parent;

		this._muted = parent._muted;
		this._loop = parent._loop;
		this._volume = parent._volume;
		this._rate = parent._rate;
		this._seek = 0;
		this._rateSeek = 0;
		this._paused = true;
		this._ended = true;
		this._sprite = "__default";

		this._id = ++Howler._counter;

		return this;
	}

	_errorListener(): void {
		if (this._node && isHTMLAudioElement(this._node)) {
			const errorCode = this._node.error ? this._node.error.code : 0;
			this._parent._emit("loaderror", this._id, String(errorCode));
			if (this._errorFn) {
				this._node.removeEventListener("error", this._errorFn, false);
			}
		}
	}

	_loadListener(): void {
		if (!this._node || !isHTMLAudioElement(this._node)) {
			return;
		}

		const parent = this._parent;

		parent._duration = Math.ceil(this._node.duration * 10) / 10;

		if (Object.keys(parent._sprite).length === 0) {
			parent._sprite = { __default: [0, parent._duration * 1000] };
		}

		if (parent._state !== "loaded") {
			parent._state = "loaded";
			parent._emit("load");
			parent._loadQueue();

			// Execute plugin hooks
			globalPluginManager.executeHowlLoad(parent);
		}

		if (this._loadFn) {
			this._node.removeEventListener(Howler._canPlayEvent, this._loadFn, false);
		}
	}

	_endListener(): void {
		const parent = this._parent;

		if (
			parent._duration === Infinity &&
			this._node &&
			isHTMLAudioElement(this._node)
		) {
			parent._duration = Math.ceil(this._node.duration * 10) / 10;

			if (parent._sprite.__default[1] === Infinity) {
				parent._sprite.__default[1] = parent._duration * 1000;
			}

			parent._ended(this);
		}

		if (this._endFn && this._node) {
			this._node.removeEventListener("ended", this._endFn, false);
		}
	}
}
