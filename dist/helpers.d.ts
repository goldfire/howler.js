import Howl from './howl';
export declare const cache: {};
/**
 * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
 */
export declare function loadBuffer(self: Howl): void;
export declare const isHTMLAudioElement: (node: any) => node is HTMLAudioElement;
export declare const isGainNode: (node: any) => node is GainNode;
export declare const isAudioBufferSourceNode: (node: any) => node is AudioBufferSourceNode;
