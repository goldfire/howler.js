/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howl } from "./howl";
// Import classes from their own files
import { HowlerGlobal } from "./howler-global";
import { Sound } from "./sound";

// Setup the global audio controller singleton
const Howler = new HowlerGlobal();

export type {
  AudioBufferSourceNodeWithLegacy,
  EventListener,
  GainNodeWithBufferSource,
  HowlOptions,
  HTMLAudioElementWithUnlocked,
  NavigatorWithCocoonJS,
  QueueItem,
  WindowWithAudio
} from "./types";
// Export for ESM - explicit exports for better tree-shaking
export { cache, isGainNode, isHTMLAudioElement } from "./types";
export { Howl, Howler, HowlerGlobal, Sound };

