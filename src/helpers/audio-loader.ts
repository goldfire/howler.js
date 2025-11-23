/*!
 *  Howler.js Audio Loading Helpers
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import type { Howl } from "../howler.core";
import { Howler } from "../howler.core";
import { globalPluginManager } from "../plugins/plugin";
import { cache } from "../types";

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
		const xhr = new XMLHttpRequest();
		xhr.open(self._xhr.method, url, true);
		xhr.withCredentials = self._xhr.withCredentials;
		xhr.responseType = "arraybuffer";

		if (self._xhr.headers) {
			Object.keys(self._xhr.headers).forEach((key) => {
				xhr.setRequestHeader(key, self._xhr.headers![key]);
			});
		}

		xhr.onload = () => {
			const code = (xhr.status + "")[0];
			if (code !== "0" && code !== "2" && code !== "3") {
				self._emit(
					"loaderror",
					null,
					"Failed loading audio file with status: " + xhr.status + ".",
				);
				return;
			}

			decodeAudioData(xhr.response, self);
		};
		xhr.onerror = () => {
			if (self._webAudio) {
				self._html5 = true;
				self._webAudio = false;
				self._sounds = [];
				delete cache[url];
				self.load();
			}
		};
		safeXhrSend(xhr);
	}
};

export const safeXhrSend = (xhr: XMLHttpRequest) => {
	try {
		xhr.send();
	} catch (e) {
		if (xhr.onerror) {
			// Create a ProgressEvent-like object for the error handler
			const errorEvent = new ProgressEvent("error", {
				lengthComputable: false,
				loaded: 0,
				total: 0,
			});
			xhr.onerror(errorEvent);
		}
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
