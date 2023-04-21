import { HowlerAudioElement } from './howler';
import Howl from './howl';
export interface HowlGainNode extends GainNode {
    bufferSource: AudioBufferSourceNode | null;
    paused: boolean;
    volume: number;
    currentTime: number;
}
declare class Sound {
    _parent: Howl;
    _muted: boolean;
    _loop: boolean;
    _volume: number;
    _rate: number;
    _seek: number;
    _paused: boolean;
    _ended: boolean;
    _sprite: string;
    _id: number;
    _node: HowlGainNode | HowlerAudioElement;
    _errorFn: EventListener;
    _loadFn: EventListener;
    _endFn: EventListener;
    _panner?: AudioParam;
    _rateSeek?: number;
    _playStart: number;
    _start: number;
    _stop: number;
    _fadeTo: number | null;
    _interval: number | null;
    /**
     * Setup the sound object, which each node attached to a Howl group is contained in.
     * @param howl The Howl parent group.
     */
    constructor(howl: Howl);
    /**
     * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
     */
    create(): this;
    /**
     * Reset the parameters of this sound to the original state (for recycle).
     */
    reset(): this;
    /**
     * HTML5 Audio error listener callback.
     */
    _errorListener(): void;
    /**
     * HTML5 Audio canplaythrough listener callback.
     */
    _loadListener(): void;
    /**
     * HTML5 Audio ended listener callback.
     */
    _endListener(): void;
}
export default Sound;
