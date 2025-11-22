/*!
 *  Howler.js Type Definitions
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

export interface HowlOptions {
  src: string | string[];
  autoplay?: boolean;
  format?: string | string[];
  html5?: boolean;
  mute?: boolean;
  loop?: boolean;
  pool?: number;
  preload?: boolean | 'metadata';
  rate?: number;
  sprite?: Record<string, [number, number, boolean?]>;
  volume?: number;
  xhr?: {
    method?: string;
    headers?: Record<string, string>;
    withCredentials?: boolean;
  };
  onend?: () => void;
  onfade?: () => void;
  onload?: () => void;
  onloaderror?: (id: number, msg: string) => void;
  onplayerror?: (id: number, msg: string) => void;
  onpause?: () => void;
  onplay?: () => void;
  onstop?: () => void;
  onmute?: () => void;
  onvolume?: () => void;
  onrate?: () => void;
  onseek?: () => void;
  onunlock?: () => void;
}

export interface EventListener {
  id?: number;
  fn: (...args: unknown[]) => void;
  once?: boolean;
}

export interface QueueItem {
  event: string;
  action: () => void;
}

// Global audio context cache
export const cache: Record<string, AudioBuffer> = {};

// Type for HTML5 Audio element with custom properties
export interface HTMLAudioElementWithUnlocked extends HTMLAudioElement {
  _unlocked?: boolean;
}

// Type for AudioBufferSourceNode with legacy methods
export interface AudioBufferSourceNodeWithLegacy extends Omit<AudioBufferSourceNode, 'loop' | 'loopEnd' | 'loopStart'> {
  noteOn?: (when: number) => void;
  noteOff?: (when: number) => void;
  noteGrainOn?: (when: number, grainOffset: number, grainDuration: number) => void;
  loop?: boolean;
  loopStart?: number | undefined;
  loopEnd?: number | undefined;
}

// Type for window with Audio constructor
export interface WindowWithAudio extends Window {
  Audio: {
    new (): HTMLAudioElement;
  };
  ejecta?: unknown;
}

// Type for Navigator with CocoonJS
export interface NavigatorWithCocoonJS extends Navigator {
  isCocoonJS?: boolean;
}

// Type for GainNode with bufferSource property
export interface GainNodeWithBufferSource extends GainNode {
  bufferSource?: AudioBufferSourceNodeWithLegacy;
}

// Type guards for audio node types
export function isHTMLAudioElement(node: HTMLAudioElementWithUnlocked | GainNodeWithBufferSource | null): node is HTMLAudioElementWithUnlocked {
  return node !== null && 
         node instanceof HTMLAudioElement &&
         'src' in node && 
         'play' in node &&
         !('videoWidth' in node);
}

export function isGainNode(node: HTMLAudioElementWithUnlocked | GainNodeWithBufferSource | null): node is GainNodeWithBufferSource {
  return node !== null && 'gain' in node && 'connect' in node;
}
