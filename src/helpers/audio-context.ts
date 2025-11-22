/*!
 *  Howler.js Audio Context Setup Helper
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howler } from '../howler.core';

export const setupAudioContext = () => {
  if (!Howler.usingWebAudio) {
    return;
  }

  try {
    if (typeof window.AudioContext !== 'undefined') {
      Howler.ctx = new window.AudioContext();
    } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
      Howler.ctx = new (window as any).webkitAudioContext();
    } else {
      Howler.usingWebAudio = false;
    }
  } catch (e) {
    Howler.usingWebAudio = false;
  }

  if (!Howler.ctx) {
    Howler.usingWebAudio = false;
  }

  const iOS = /iP(hone|od|ad)/.test((Howler._navigator && Howler._navigator.platform || ""));
  const appVersion = Howler._navigator && Howler._navigator.appVersion?.match(/OS (\d+)_(\d+)_?(\d+)?/);
  const version = appVersion ? parseInt(appVersion[1], 10) : null;
  if (iOS && version && version < 9) {
    const safari = /safari/.test(Howler._navigator?.userAgent.toLowerCase() ?? '');
    if (Howler._navigator && !safari) {
      Howler.usingWebAudio = false;
    }
  }

  if (Howler.usingWebAudio && Howler.ctx) {
    Howler.masterGain = typeof Howler.ctx.createGain === 'undefined' ? (Howler.ctx as any).createGainNode() : Howler.ctx.createGain();
    if (Howler.masterGain) {
      Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : Howler._volume, Howler.ctx.currentTime);
      Howler.masterGain.connect(Howler.ctx.destination);
    }
  }

  Howler._setup();
};
