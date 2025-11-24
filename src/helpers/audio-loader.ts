import { cache } from "../cache";
import type { Howl } from "../howler.core";
import { Howler } from "../howler.core";
import { globalPluginManager } from "../plugins/plugin";

export const loadBuffer = (self: Howl) => {
	const url = self._src as string;

	if (cache[url]) {
		self._duration = cache[url].duration;
		loadSound(self);
		return;
	}

	if (/^data:[^;]+;base64,/.test(url)) {
		const data = atob(url.split(",")[1]);
		const dataView = new Uint8Array(data.length);
		for (let i = 0; i < data.length; ++i) {
			dataView[i] = data.charCodeAt(i);
		}

		decodeAudioData(dataView.buffer, self);
	} else {
		// Use fetch API (supported in all target browsers)
		const fetchOptions: RequestInit = {
			method: self._xhr.method,
			credentials: self._xhr.withCredentials ? "include" : "same-origin",
		};

		if (self._xhr.headers) {
			fetchOptions.headers = self._xhr.headers;
		}

		fetch(url, fetchOptions)
			.then((response) => {
				if (!response.ok) {
					self._emit(
						"loaderror",
						null,
						"Failed loading audio file with status: " + response.status + ".",
					);
					return;
				}
				return response.arrayBuffer();
			})
			.then((arrayBuffer) => {
				if (arrayBuffer) {
					decodeAudioData(arrayBuffer, self);
				}
			})
			.catch(() => {
				if (self._webAudio) {
					self._html5 = true;
					self._webAudio = false;
					self._sounds = [];
					delete cache[url];
					self.load();
				}
			});
	}
};

export const decodeAudioData = (arraybuffer: ArrayBuffer, self: Howl) => {
	const error = () => {
		self._emit("loaderror", null, "Decoding audio data failed.");
	};

	const success = (buffer: AudioBuffer) => {
		if (buffer && self._sounds.length > 0) {
			cache[self._src as string] = buffer;
			loadSound(self, buffer);
		} else {
			error();
		}
	};

	if (
		typeof Promise !== "undefined" &&
		Howler.ctx!.decodeAudioData.length === 1
	) {
		(Howler.ctx!.decodeAudioData(arraybuffer) as Promise<AudioBuffer>)
			.then(success)
			.catch(error);
	} else {
		Howler.ctx!.decodeAudioData(arraybuffer, success, error);
	}
};

export const loadSound = (self: Howl, buffer?: AudioBuffer) => {
	if (buffer && !self._duration) {
		self._duration = buffer.duration;
	}

	if (Object.keys(self._sprite).length === 0) {
		self._sprite = { __default: [0, self._duration * 1000] };
	}

	if (self._state !== "loaded") {
		self._state = "loaded";
		self._emit("load");
		self._loadQueue();

		// Execute plugin hooks
		globalPluginManager.executeHowlLoad(self);
	}
};
