import { Howler } from "../howler.core";
import { getIOSVersion, isIOS, isSafari } from "./light-ua-parser";

export const setupAudioContext = () => {
	if (!Howler.usingWebAudio) {
		return;
	}

	try {
		if (typeof window.AudioContext !== "undefined") {
			Howler.ctx = new window.AudioContext();
		} else {
			Howler.usingWebAudio = false;
		}
	} catch (e) {
		Howler.usingWebAudio = false;
	}

	if (!Howler.ctx) {
		Howler.usingWebAudio = false;
	}

	const iOS = isIOS(Howler._navigator);
	const version = getIOSVersion(Howler._navigator);
	if (iOS && version && version < 9) {
		const safari = isSafari(Howler._navigator);
		if (Howler._navigator && !safari) {
			Howler.usingWebAudio = false;
		}
	}

	if (Howler.usingWebAudio && Howler.ctx) {
		Howler.masterGain = Howler.ctx.createGain();
		if (Howler.masterGain) {
			Howler.masterGain.gain.setValueAtTime(
				Howler._muted ? 0 : Howler._volume,
				Howler.ctx.currentTime,
			);
			Howler.masterGain.connect(Howler.ctx.destination);
		}
	}

	Howler._setup();
};
