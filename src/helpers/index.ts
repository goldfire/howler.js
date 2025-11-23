/*!
 *  Howler.js Helper Functions
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

export { setupAudioContext } from "./audio-context";
export {
	decodeAudioData,
	loadBuffer,
	loadSound,
	safeXhrSend,
} from "./audio-loader";
export {
	getIOSVersion,
	getOperaVersion,
	getSafariVersion,
	isAppleVendor,
	isChromeBased,
	isCocoonJS,
	isIE,
	isIOS,
	isOldOpera,
	isOldSafari,
	isOpera,
	isSafari,
} from "./light-ua-parser";
