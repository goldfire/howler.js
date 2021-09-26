import Sound from './sound';
export declare type HowlCallback = (soundId: number) => void;
export declare type HowlErrorCallback = (soundId: number, error: unknown) => void;
export interface SoundSpriteDefinitions {
    [name: string]: [number, number] | [number, number, boolean];
}
export interface HowlXHROptions {
    method?: string;
    headers?: Record<string, string>;
    withCredentials?: boolean;
}
export interface HowlListeners {
    /**
     * Fires when the sound has been stopped. The first parameter is the ID of the sound.
     */
    onstop?: HowlCallback;
    /**
     * Fires when the sound has been paused. The first parameter is the ID of the sound.
     */
    onpause?: HowlCallback;
    /**
     * Fires when the sound is loaded.
     */
    onload?: HowlCallback;
    /**
     * Fires when the sound has been muted/unmuted. The first parameter is the ID of the sound.
     */
    onmute?: HowlCallback;
    /**
     * Fires when the sound's volume has changed. The first parameter is the ID of the sound.
     */
    onvolume?: HowlCallback;
    /**
     * Fires when the sound's playback rate has changed. The first parameter is the ID of the sound.
     */
    onrate?: HowlCallback;
    /**
     * Fires when the sound has been seeked. The first parameter is the ID of the sound.
     */
    onseek?: HowlCallback;
    /**
     * Fires when the current sound finishes fading in/out. The first parameter is the ID of the sound.
     */
    onfade?: HowlCallback;
    /**
     * Fires when audio has been automatically unlocked through a touch/click event.
     */
    onunlock?: HowlCallback;
    /**
     * Fires when the sound finishes playing (if it is looping, it'll fire at the end of each loop).
     * The first parameter is the ID of the sound.
     */
    onend?: HowlCallback;
    /**
     * Fires when the sound begins playing. The first parameter is the ID of the sound.
     */
    onplay?: HowlCallback;
    /**
     * Fires when the sound is unable to load. The first parameter is the ID of the sound (if it exists) and the second is the error message/code.
     */
    onloaderror?: HowlErrorCallback;
    /**
     * Fires when the sound is unable to play. The first parameter is the ID of the sound and the second is the error message/code.
     */
    onplayerror?: HowlErrorCallback;
}
export interface HowlOptions extends HowlListeners {
    /**
     * The sources to the track(s) to be loaded for the sound (URLs or base64 data URIs). These should
     * be in order of preference, howler.js will automatically load the first one that is compatible
     * with the current browser. If your files have no extensions, you will need to explicitly specify
     * the extension using the format property.
     *
     * @default `[]`
     */
    src?: string | string[];
    /**
     * The volume of the specific track, from 0.0 to 1.0.
     *
     * @default `1.0`
     */
    volume?: number;
    /**
     * Set to true to force HTML5 Audio. This should be used for large audio files so that you don't
     * have to wait for the full file to be downloaded and decoded before playing.
     *
     * @default `false`
     */
    html5?: boolean;
    /**
     * Set to true to automatically loop the sound forever.
     *
     * @default `false`
     */
    loop?: boolean;
    /**
     * Automatically begin downloading the audio file when the Howl is defined. If using HTML5 Audio,
     * you can set this to 'metadata' to only preload the file's metadata (to get its duration without
     * download the entire file, for example).
     *
     * @default `true`
     */
    preload?: boolean | 'metadata';
    /**
     * Set to true to automatically start playback when sound is loaded.
     *
     * @default `false`
     */
    autoplay?: boolean;
    /**
     * Set to true to load the audio muted.
     *
     * @default `false`
     */
    mute?: boolean;
    /**
     * Define a sound sprite for the sound. The offset and duration are defined in milliseconds. A
     * third (optional) parameter is available to set a sprite as looping. An easy way to generate
     * compatible sound sprites is with audiosprite.
     *
     * @default `{}`
     */
    sprite?: SoundSpriteDefinitions;
    /**
     * The rate of playback. 0.5 to 4.0, with 1.0 being normal speed.
     *
     * @default `1.0`
     */
    rate?: number;
    /**
     * The size of the inactive sounds pool. Once sounds are stopped or finish playing, they are marked
     * as ended and ready for cleanup. We keep a pool of these to recycle for improved performance.
     * Generally this doesn't need to be changed. It is important to keep in mind that when a sound is
     * paused, it won't be removed from the pool and will still be considered active so that it can be
     * resumed later.
     *
     * @default `5`
     */
    pool?: number;
    /**
     * howler.js automatically detects your file format from the extension, but you may also specify a
     * format in situations where extraction won't work (such as with a SoundCloud stream).
     *
     * @default `[]`
     */
    format?: string[];
    /**
     * When using Web Audio, howler.js uses an XHR request to load the audio files. If you need to send
     * custom headers, set the HTTP method or enable withCredentials (see reference), include them with
     * this parameter. Each is optional (method defaults to GET, headers default to undefined and
     * withCredentials defaults to false).
     */
    xhr?: HowlXHROptions;
}
declare type HowlCallbacks = Array<{
    fn: HowlCallback;
}>;
declare type HowlErrorCallbacks = Array<{
    fn: HowlErrorCallback;
}>;
declare type HowlEvent = 'play' | 'end' | 'pause' | 'stop' | 'mute' | 'volume' | 'rate' | 'seek' | 'fade' | 'unlock' | 'load' | 'loaderror' | 'playerror';
interface HowlEventHandler {
    event: HowlEvent;
    action: () => void;
}
declare class Howl {
    _autoplay: boolean;
    _format: string[];
    _html5: boolean;
    _muted: boolean;
    _loop: boolean;
    _pool: number;
    _preload: boolean | 'metadata';
    _rate: number;
    _sprite: SoundSpriteDefinitions;
    _src: string | string[];
    _volume: number;
    _xhr: HowlOptions['xhr'];
    _duration: number;
    _state: 'unloaded' | 'loading' | 'loaded';
    _sounds: Sound[];
    _endTimers: {};
    _queue: HowlEventHandler[];
    _playLock: boolean;
    _onend: HowlCallbacks;
    _onfade: HowlCallbacks;
    _onload: HowlCallbacks;
    _onloaderror: HowlErrorCallbacks;
    _onplayerror: HowlErrorCallbacks;
    _onpause: HowlCallbacks;
    _onplay: HowlCallbacks;
    _onstop: HowlCallbacks;
    _onmute: HowlCallbacks;
    _onvolume: HowlCallbacks;
    _onrate: HowlCallbacks;
    _onseek: HowlCallbacks;
    _onunlock: HowlCallbacks;
    _onresume: HowlCallbacks;
    _webAudio: boolean;
    /**
     * Create an audio group controller.
     * @param o Passed in properties for this group.
     */
    constructor(o: HowlOptions);
    /**
     * Load the audio file.
     */
    load(): this;
    /**
     * Play a sound or resume previous playback.
     * @param sprite Sprite name for sprite playback or sound id to continue previous.
     * @param internal Internal Use: true prevents event firing.
     * @return Sound ID.
     */
    play(sprite?: string | number, internal?: boolean): number | null | undefined;
    /**
     * Pause playback and save current position.
     * @param id The sound ID (empty to pause all in group).
     * @param skipEmit If true, the `pause` event won't be emitted.
     */
    pause(id: number, skipEmit?: boolean): this;
    /**
     * Stop playback and reset to start.
     * @param id The sound ID (empty to stop all in group).
     * @param internal Internal Use: true prevents event firing.
     */
    stop(id?: number, internal?: boolean): this;
    /**
     * Mute/unmute a single sound or all sounds in this Howl group.
     * @param muted Set to true to mute and false to unmute.
     * @param id    The sound ID to update (omit to mute/unmute all).
     */
    mute(muted: boolean, id: number): boolean | this;
    /**
     * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
     *   volume() -> Returns the group's volume value.
     *   volume(id) -> Returns the sound id's current volume.
     *   volume(vol) -> Sets the volume of all sounds in this Howl group.
     *   volume(vol, id) -> Sets the volume of passed sound id.
     * @return Returns this or current volume.
     */
    volume(...args: any[]): number | this;
    /**
     * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
     * @param from The value to fade from (0.0 to 1.0).
     * @param to   The volume to fade to (0.0 to 1.0).
     * @param len  Time in milliseconds to fade.
     * @param id   The sound id (omit to fade all sounds).
     */
    fade(from: number | string, to: number | string, len: number | string, id: number): this;
    /**
     * Starts the internal interval to fade a sound.
     * @param sound Reference to sound to fade.
     * @param from The value to fade from (0.0 to 1.0).
     * @param to   The volume to fade to (0.0 to 1.0).
     * @param len  Time in milliseconds to fade.
     * @param id   The sound id to fade.
     * @param isGroup   If true, set the volume on the group.
     */
    _startFadeInterval(sound: Sound, from: number, to: number, len: number, id: number, isGroup: boolean): void;
    /**
     * Internal method that stops the currently playing fade when
     * a new fade starts, volume is changed or the sound is stopped.
     * @param  {Number} id The sound id.
     * @return {Howl}
     */
    _stopFade(id: any): this;
    /**
     * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
     *   loop() -> Returns the group's loop value.
     *   loop(id) -> Returns the sound id's loop value.
     *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
     *   loop(loop, id) -> Sets the loop value of passed sound id.
     * @return Returns this or current loop value.
     */
    loop(...args: any[]): any;
    /**
     * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   rate() -> Returns the first sound node's current playback rate.
     *   rate(id) -> Returns the sound id's current playback rate.
     *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
     *   rate(rate, id) -> Sets the playback rate of passed sound id.
     * @return Returns this or the current playback rate.
     */
    rate(...args: any[]): any;
    /**
     * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   seek() -> Returns the first sound node's current seek position.
     *   seek(id) -> Returns the sound id's current seek position.
     *   seek(seek) -> Sets the seek position of the first sound node.
     *   seek(seek, id) -> Sets the seek position of passed sound id.
     * @return Returns this or the current seek position.
     */
    seek(...args: any[]): number | this;
    /**
     * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
     * @param id The sound id to check. If none is passed, the whole sound group is checked.
     * @return True if playing and false if not.
     */
    playing(id: number): boolean;
    /**
     * Get the duration of this sound. Passing a sound id will return the sprite duration.
     * @param id The sound id to check. If none is passed, return full source duration.
     * @return Audio duration in seconds.
     */
    duration(id: number): number;
    /**
     * Returns the current loaded state of this Howl.
     * @return 'unloaded', 'loading', 'loaded'
     */
    state(): "loaded" | "loading" | "unloaded";
    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all sound instances attached to this group.
     */
    unload(): null;
    /**
     * Listen to a custom event.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
     */
    on(event: string, fn: Function, id?: number, once?: number): this;
    /**
     * Remove a custom event. Call without parameters to remove all events.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to remove. Leave empty to remove all.
     * @param  {Number}   id    (optional) Only remove events for this sound.
     * @return {Howl}
     */
    off(event: any, fn: any, id: any): this;
    /**
     * Listen to a custom event and remove it once fired.
     * @param event Event name.
     * @param fn    Listener to call.
     * @param id    (optional) Only listen to events for this sound.
     */
    once(event: string, fn: Function, id?: number): this;
    /**
     * Emit all events of a specific type and pass the sound id.
     * @param event Event name.
     * @param id    Sound ID.
     * @param msg   Message to go with event.
     */
    _emit(event: string, id?: number | null, msg?: string | number): this;
    /**
     * Queue of actions initiated before the sound has loaded.
     * These will be called in sequence, with the next only firing
     * after the previous has finished executing (even if async like play).
     */
    _loadQueue(event?: string): this;
    /**
     * Fired when playback ends at the end of the duration.
     * @param sound The sound object to work with.
     */
    _ended(sound: Sound): this;
    /**
     * Clear the end timer for a sound playback.
     * @param  {Number} id The sound ID.
     */
    _clearTimer(id: number): this;
    /**
     * Return the sound identified by this ID, or return null.
     * @param id Sound ID
     * @return Sound object or null.
     */
    _soundById(id: number): Sound | null;
    /**
     * Return an inactive sound from the pool or create a new one.
     * @return Sound playback object.
     */
    _inactiveSound(): Sound;
    /**
     * Drain excess inactive sounds from the pool.
     */
    _drain(): void;
    /**
     * Get all ID's from the sounds pool.
     * @param id Only return one ID if one is passed.
     * @return Array of IDs.
     */
    _getSoundIds(id?: number): number[];
    /**
     * Load the sound back into the buffer source.
     * @param sound The sound object to work with.
     */
    _refreshBuffer(sound: Sound): this;
    /**
     * Prevent memory leaks by cleaning up the buffer source after playback.
     * @param  {Object} node Sound's audio node containing the buffer source.
     * @return {Howl}
     */
    _cleanBuffer(node: Sound['_node']): this;
    /**
     * Set the source to a 0-second silence to stop any downloading (except in IE).
     * @param  {Object} node Audio node to clear.
     */
    _clearSound(node: any): void;
}
export default Howl;
