/**
 * TODO: pass the howler instance reference to each sound that is created instead of using a global variable
 * TODO: update the sound id generator to be common across all modules.
 *
 * IDEA: Maybe use ES private properties, as they can be compiled away with esbuild + TS.
 */

import Howler from './howler';
import Howl from './howl';

interface HowlGainNode extends GainNode {
  bufferSource: AudioBufferSourceNode | null;
  paused: boolean;
  volume: number;
}

class Sound {
  _parent: Howl;
  _muted: boolean;
  _loop: boolean;
  _volume: number;
  _rate: number;
  _seek: number = 0;
  _paused: boolean = true;
  _ended: boolean = true;
  _sprite: string = '__default';
  _id: number;

  _node: HowlGainNode | HTMLAudioElement;
  _errorFn: EventListener = () => {};
  _loadFn: EventListener = () => {};
  _endFn: EventListener = () => {};
  // TODO: Add better type when adding the spatial audio plugin.
  _panner: unknown;

  _rateSeek?: number;

  /**
   * Setup the sound object, which each node attached to a Howl group is contained in.
   * @param {Object} howl The Howl parent group.
   */
  constructor(howl: Howl) {
    this._parent = howl;

    // Setup the default parameters.
    this._muted = Boolean(howl._muted);
    this._loop = Boolean(howl._loop);
    this._volume = howl._volume;
    this._rate = howl._rate;

    // Generate a unique ID for this sound.
    this._id = ++Howler._counter;

    // Add itself to the parent's pool.
    this._parent._sounds.push(this);

    if (this._parent._webAudio) {
      // Create the gain node for controlling volume (the source will connect to this).
      this._node = (
        typeof Howler.ctx.createGain === 'undefined'
          ? // @ts-expect-error Support old browsers
            Howler.ctx.createGainNode()
          : Howler.ctx.createGain()
      ) as HowlGainNode;
    } else {
      // Get an unlocked Audio object from the pool.
      this._node = Howler._obtainHtml5Audio() as HTMLAudioElement;
    }

    // Create the new node.
    this.create();
  }

  /**
   * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
   * @return {Sound}
   */
  create() {
    var parent = this._parent;
    var volume =
      Howler._muted || this._muted || this._parent._muted ? 0 : this._volume;

    if (parent._webAudio) {
      (this._node as HowlGainNode).gain.setValueAtTime(
        volume,
        Howler.ctx.currentTime,
      );
      (this._node as HowlGainNode).paused = true;
      (this._node as HowlGainNode).connect(Howler.masterGain as GainNode);
    } else if (!Howler.noAudio) {
      // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
      this._errorFn = this._errorListener.bind(this);
      this._node.addEventListener('error', this._errorFn, false);

      // Listen for 'canplaythrough' event to let us know the sound is ready.
      this._loadFn = this._loadListener.bind(this);
      this._node.addEventListener(Howler._canPlayEvent, this._loadFn, false);

      // Listen for the 'ended' event on the sound to account for edge-case where
      // a finite sound has a duration of Infinity.
      this._endFn = this._endListener.bind(this);
      this._node.addEventListener('ended', this._endFn, false);

      // Setup the new audio node.
      (this._node as HTMLAudioElement).src = parent._src as string;
      (this._node as HTMLAudioElement).preload =
        parent._preload === true ? 'auto' : (parent._preload as string);
      this._node.volume = volume * (Howler.volume() as number);

      // Begin loading the source.
      (this._node as HTMLAudioElement).load();
    }

    return this;
  }

  /**
   * Reset the parameters of this sound to the original state (for recycle).
   * @return {Sound}
   */
  reset() {
    var parent = this._parent;

    // Reset all of the parameters of this sound.
    this._muted = parent._muted;
    this._loop = parent._loop;
    this._volume = parent._volume;
    this._rate = parent._rate;
    this._seek = 0;
    this._rateSeek = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = '__default';

    // Generate a new ID so that it isn't confused with the previous sound.
    this._id = ++Howler._counter;

    return this;
  }

  /**
   * HTML5 Audio error listener callback.
   */
  _errorListener() {
    // Fire an error event and pass back the code.
    this._parent._emit(
      'loaderror',
      this._id,
      (this._node as HTMLAudioElement).error instanceof MediaError
        ? ((this._node as HTMLAudioElement).error as MediaError).code
        : 0,
    );

    // Clear the event listener.
    this._node.removeEventListener('error', this._errorFn, false);
  }

  /**
   * HTML5 Audio canplaythrough listener callback.
   */
  _loadListener() {
    var parent = this._parent;

    // Round up the duration to account for the lower precision in HTML5 Audio.
    parent._duration =
      Math.ceil((this._node as HTMLAudioElement).duration * 10) / 10;

    // Setup a sprite if none is defined.
    if (Object.keys(parent._sprite).length === 0) {
      parent._sprite = { __default: [0, parent._duration * 1000] };
    }

    if (parent._state !== 'loaded') {
      parent._state = 'loaded';
      parent._emit('load');
      parent._loadQueue();
    }

    // Clear the event listener.
    this._node.removeEventListener(Howler._canPlayEvent, this._loadFn, false);
  }

  /**
   * HTML5 Audio ended listener callback.
   */
  _endListener() {
    var parent = this._parent;

    // Only handle the `ended`` event if the duration is Infinity.
    if (parent._duration === Infinity) {
      // Update the parent duration to match the real audio duration.
      // Round up the duration to account for the lower precision in HTML5 Audio.
      parent._duration =
        Math.ceil((this._node as HTMLAudioElement).duration * 10) / 10;

      // Update the sprite that corresponds to the real duration.
      if (parent._sprite.__default[1] === Infinity) {
        parent._sprite.__default[1] = parent._duration * 1000;
      }

      // Run the regular ended method.
      parent._ended(this);
    }

    // Clear the event listener since the duration is now correct.
    this._node.removeEventListener('ended', this._endFn, false);
  }
}

export default Sound;
