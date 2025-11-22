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
  fn: (...args: any[]) => void;
  once?: boolean;
}

export interface QueueItem {
  event: string;
  action: () => void;
}

// Global audio context cache
export const cache: Record<string, AudioBuffer> = {};
