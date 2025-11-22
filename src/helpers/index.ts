/*!
 *  Howler.js Helper Functions
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

export { loadBuffer, safeXhrSend, decodeAudioData, loadSound } from './audio-loader';
export { setupAudioContext } from './audio-context';
export { isIOS, getIOSVersion, isSafari, getSafariVersion, isOldSafari, isOpera, getOperaVersion, isOldOpera, isIE, isAppleVendor, isChromeBased, isCocoonJS } from './light-ua-parser';
