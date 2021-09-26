import Howl from './howl';
export interface HowlerAudioElement extends HTMLAudioElement {
    _unlocked: boolean;
}
declare type HowlerAudioContextState = AudioContextState | 'suspending' | 'closed' | 'interrupted';
export declare type HowlerAudioContext = Omit<AudioContext, 'state'> & {
    state: AudioContextState | 'interrupted';
};
declare class Howler {
    masterGain: GainNode | null;
    noAudio: boolean;
    usingWebAudio: boolean;
    autoSuspend: boolean;
    ctx: HowlerAudioContext | null;
    autoUnlock: boolean;
    _counter: number;
    _html5AudioPool: Array<HTMLAudioElement>;
    html5PoolSize: number;
    _codecs: {};
    _howls: Array<Howl>;
    _muted: boolean;
    _volume: number;
    _canPlayEvent: string;
    _navigator: Navigator;
    _audioUnlocked: boolean;
    _mobileUnloaded: boolean;
    state: HowlerAudioContextState;
    _suspendTimer: number | null;
    _resumeAfterSuspend?: boolean;
    _scratchBuffer: any;
    /**
     * Create the global controller. All contained methods and properties apply
     * to all sounds that are currently playing or will be in the future.
     */
    constructor();
    /**
     * Get/set the global volume for all sounds.
     * @param vol Volume from 0.0 to 1.0.
     * @return Returns self or current volume.
     */
    volume(vol?: number | string): number | this;
    /**
     * Handle muting and unmuting globally.
     * @param muted Is muted or not.
     */
    mute(muted: boolean): this;
    /**
     * Handle stopping all sounds globally.
     */
    stop(): this;
    /**
     * Unload and destroy all currently loaded Howl objects.
     */
    unload(): this;
    /**
     * Check for codec support of specific extension.
     * @param ext Audio file extention.
     */
    codecs(ext: string): any;
    /**
     * Setup various state values for global tracking.
     */
    _setup(): this;
    /**
     * Setup the audio context when available, or switch to HTML5 Audio mode.
     */
    _setupAudioContext(): void;
    /**
     * Check for browser support for various codecs and cache the results.
     */
    _setupCodecs(): this;
    /**
     * Some browsers/devices will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     */
    _unlockAudio(): this;
    /**
     * Get an unlocked HTML5 Audio object from the pool. If none are left,
     * return a new Audio object and throw a warning.
     * @return HTML5 Audio object.
     */
    _obtainHtml5Audio(): HTMLAudioElement | undefined;
    /**
     * Return an activated HTML5 Audio object to the pool.
     */
    _releaseHtml5Audio(audio: HowlerAudioElement): this;
    /**
     * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
     * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
     */
    _autoSuspend(): this | undefined;
    /**
     * Automatically resume the Web Audio AudioContext when a new sound is played.
     */
    _autoResume(): this | undefined;
}
declare const HowlerSingleton: Howler;
export default HowlerSingleton;
