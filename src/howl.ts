import Howler, { HowlerAudioContext, HowlerAudioElement } from './howler';
import { loadBuffer, cache } from './helpers';
import Sound, { HowlGainNode } from './sound';

export type HowlCallback = (soundId: number) => void;
export type HowlErrorCallback = (soundId: number, error: unknown) => void;

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

type HowlCallbacks = Array<{ fn: HowlCallback }>;
type HowlErrorCallbacks = Array<{ fn: HowlErrorCallback }>;

type HowlEvent =
  | 'play'
  | 'end'
  | 'pause'
  | 'stop'
  | 'mute'
  | 'volume'
  | 'rate'
  | 'seek'
  | 'fade'
  | 'unlock'
  | 'load'
  | 'loaderror'
  | 'playerror';

interface HowlEventHandler {
  event: HowlEvent;
  action: () => void;
}

class Howl {
  // User defined properties
  _autoplay: boolean = false;
  _format: string[] = [];
  _html5: boolean = false;
  _muted: boolean = false;
  _loop: boolean = false;
  _pool: number = 5;
  _preload: boolean | 'metadata' = true;
  _rate: number = 1;
  _sprite: SoundSpriteDefinitions = {};
  _src: string | string[] = [];
  _volume: number = 1;
  _xhr: HowlOptions['xhr'];

  // Other default properties.
  _duration = 0;
  _state: 'unloaded' | 'loading' | 'loaded' = 'unloaded';
  _sounds: Sound[] = [];
  _endTimers = {};
  _queue: HowlEventHandler[] = [];
  _playLock = false;

  _onend: HowlCallbacks = [];
  _onfade: HowlCallbacks = [];
  _onload: HowlCallbacks = [];
  _onloaderror: HowlErrorCallbacks = [];
  _onplayerror: HowlErrorCallbacks = [];
  _onpause: HowlCallbacks = [];
  _onplay: HowlCallbacks = [];
  _onstop: HowlCallbacks = [];
  _onmute: HowlCallbacks = [];
  _onvolume: HowlCallbacks = [];
  _onrate: HowlCallbacks = [];
  _onseek: HowlCallbacks = [];
  _onunlock: HowlCallbacks = [];
  _onresume: HowlCallbacks = [];

  // @ts-expect-error Not definitely assigned in constructor, likely due to using a module.
  _webAudio: boolean;

  /**
   * Create an audio group controller.
   * @param o Passed in properties for this group.
   */
  constructor(o: HowlOptions) {
    // Throw an error if no source is provided.
    if (!o.src || o.src.length === 0) {
      console.error(
        'An array of source files must be passed with any new Howl.',
      );
      return;
    }

    // If we don't have an AudioContext created yet, run the setup.
    if (!Howler.ctx) {
      Howler._setupAudioContext();
    }

    // Setup user-defined default properties.
    this._format =
      o.format === undefined
        ? []
        : typeof o.format !== 'string'
        ? o.format
        : [o.format];
    this._html5 = o.html5 || false;
    this._muted = o.mute || false;
    this._loop = o.loop || false;
    this._pool = o.pool || 5;

    this._preload =
      typeof o.preload === 'boolean' || o.preload === 'metadata'
        ? o.preload
        : true;
    this._rate = o.rate || 1;
    this._sprite = o.sprite || {};
    this._src = typeof o.src !== 'string' ? o.src : [o.src];
    this._volume = o.volume !== undefined ? o.volume : 1;
    this._xhr = {
      method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : undefined,
      withCredentials:
        o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
    };

    // Setup event listeners.
    this._onend = o.onend ? [{ fn: o.onend }] : [];
    this._onfade = o.onfade ? [{ fn: o.onfade }] : [];
    this._onload = o.onload ? [{ fn: o.onload }] : [];
    this._onloaderror = o.onloaderror ? [{ fn: o.onloaderror }] : [];
    this._onplayerror = o.onplayerror ? [{ fn: o.onplayerror }] : [];
    this._onpause = o.onpause ? [{ fn: o.onpause }] : [];
    this._onplay = o.onplay ? [{ fn: o.onplay }] : [];
    this._onstop = o.onstop ? [{ fn: o.onstop }] : [];
    this._onmute = o.onmute ? [{ fn: o.onmute }] : [];
    this._onvolume = o.onvolume ? [{ fn: o.onvolume }] : [];
    this._onrate = o.onrate ? [{ fn: o.onrate }] : [];
    this._onseek = o.onseek ? [{ fn: o.onseek }] : [];
    this._onunlock = o.onunlock ? [{ fn: o.onunlock }] : [];
    this._onresume = [];

    // Web Audio or HTML5 Audio?
    this._webAudio = Howler.usingWebAudio && !this._html5;

    // Automatically try to enable audio.
    if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
      Howler._unlockAudio();
    }

    // Keep track of this Howl group in the global controller.
    Howler._howls.push(this);

    // If they selected autoplay, add a play event to the load queue.
    if (this._autoplay) {
      this._queue.push({
        event: 'play',
        action: () => {
          this.play();
        },
      });
    }

    // Load the source file unless otherwise specified.
    if (this._preload) {
      this.load();
    }
  }

  /**
   * Load the audio file.
   */
  load() {
    var url: string | null = null;

    // If no audio is available, quit immediately.
    if (Howler.noAudio) {
      this._emit('loaderror', null, 'No audio support.');
      return this;
    }

    // Make sure our source is in an array.
    if (typeof this._src === 'string') {
      this._src = [this._src];
    }

    // Loop through the sources and pick the first one that is compatible.
    for (var i = 0; i < this._src.length; i++) {
      var ext, str;

      if (this._format && this._format[i]) {
        // If an extension was specified, use that instead.
        ext = this._format[i];
      } else {
        // Make sure the source is a string.
        str = this._src[i];
        if (typeof str !== 'string') {
          this._emit(
            'loaderror',
            null,
            'Non-string found in selected audio sources - ignoring.',
          );
          continue;
        }

        // Extract the file extension from the URL or base64 data URI.
        ext = /^data:audio\/([^;,]+);/i.exec(str);
        if (!ext) {
          ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
        }

        if (ext) {
          ext = ext[1].toLowerCase();
        }
      }

      // Log a warning if no extension was found.
      if (!ext) {
        console.warn(
          'No file extension was found. Consider using the "format" property or specify an extension.',
        );
      }

      // Check if this extension is available.
      if (ext && Howler.codecs(ext)) {
        url = this._src[i];
        break;
      }
    }

    if (!url) {
      this._emit(
        'loaderror',
        null,
        'No codec support for selected audio sources.',
      );
      return this;
    }

    this._src = url;
    this._state = 'loading';

    // If the hosting page is HTTPS and the source isn't,
    // drop down to HTML5 Audio to avoid Mixed Content errors.
    if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
      this._html5 = true;
      this._webAudio = false;
    }

    // Create a new sound object and add it to the pool.
    new Sound(this);

    // Load and decode the audio data for playback.
    if (this._webAudio) {
      loadBuffer(this);
    }

    return this;
  }

  /**
   * Play a sound or resume previous playback.
   * @param sprite Sprite name for sprite playback or sound id to continue previous.
   * @param internal Internal Use: true prevents event firing.
   * @return Sound ID.
   */
  play(sprite?: string | number, internal?: boolean) {
    var id: number | null = null;

    // Determine if a sprite, sound id or nothing was passed
    if (typeof sprite === 'number') {
      id = sprite;
      // @ts-expect-error Not sure how to handle this with TypeScript.
      sprite = null;
    } else if (
      typeof sprite === 'string' &&
      this._state === 'loaded' &&
      !this._sprite[sprite]
    ) {
      // If the passed sprite doesn't exist, do nothing.
      return null;
    } else if (typeof sprite === 'undefined') {
      // Use the default sound sprite (plays the full audio length).
      sprite = '__default';

      // Check if there is a single paused sound that isn't ended.
      // If there is, play that sound. If not, continue as usual.
      if (!this._playLock) {
        var num = 0;
        for (var i = 0; i < this._sounds.length; i++) {
          if (this._sounds[i]._paused && !this._sounds[i]._ended) {
            num++;
            id = this._sounds[i]._id;
          }
        }

        if (num === 1) {
          // @ts-expect-error Not sure how to handle this with TypeScript.
          sprite = null;
        } else {
          id = null;
        }
      }
    }

    // Get the selected node, or get one from the pool.
    const sound = id ? this._soundById(id) : this._inactiveSound();

    // If the sound doesn't exist, do nothing.
    if (!sound) {
      return null;
    }

    // Select the sprite definition.
    if (id && !sprite) {
      sprite = sound._sprite || '__default';
    }

    // If the sound hasn't loaded, we must wait to get the audio's duration.
    // We also need to wait to make sure we don't run into race conditions with
    // the order of function calls.
    if (this._state !== 'loaded') {
      // Set the sprite value on this sound.
      sound._sprite = sprite as string;

      // Mark this sound as not ended in case another sound is played before this one loads.
      sound._ended = false;

      // Add the sound to the queue to be played on load.
      var soundId = sound._id;
      this._queue.push({
        event: 'play',
        action: () => {
          this.play(soundId);
        },
      });

      return soundId;
    }

    // Don't play the sound if an id was passed and it is already playing.
    if (id && !sound._paused) {
      // Trigger the play event, in order to keep iterating through queue.
      if (!internal) {
        this._loadQueue('play');
      }

      return sound._id;
    }

    // Make sure the AudioContext isn't suspended, and resume it if it is.
    if (this._webAudio) {
      Howler._autoResume();
    }

    // Determine how long to play for and where to start playing.
    const seek = Math.max(
      0,
      sound._seek > 0 ? sound._seek : this._sprite[sprite as string][0] / 1000,
    );
    const duration = Math.max(
      0,
      (this._sprite[sprite as string][0] + this._sprite[sprite as string][1]) /
        1000 -
        seek,
    );
    const timeout = (duration * 1000) / Math.abs(sound._rate);
    const start = this._sprite[sprite as string][0] / 1000;
    const stop =
      (this._sprite[sprite as string][0] + this._sprite[sprite as string][1]) /
      1000;
    sound._sprite = sprite as string;

    // Mark the sound as ended instantly so that this async playback
    // doesn't get grabbed by another call to play while this one waits to start.
    sound._ended = false;

    // Update the parameters of the sound.
    const setParams = () => {
      sound._paused = false;
      sound._seek = seek;
      sound._start = start;
      sound._stop = stop;
      sound._loop = !!(sound._loop || this._sprite[sprite as string][2]);
    };

    // End the sound instantly if seek is at the end.
    if (seek >= stop) {
      this._ended(sound);
      return;
    }

    // Begin the actual playback.
    const node = sound._node;
    if (this._webAudio) {
      // Fire this when the sound is ready to play to begin Web Audio playback.
      const playWebAudio = () => {
        this._playLock = false;
        setParams();
        this._refreshBuffer(sound);

        // Setup the playback params.
        const vol = sound._muted || this._muted ? 0 : sound._volume;
        (node as HowlGainNode).gain.setValueAtTime(
          vol,
          (Howler.ctx as HowlerAudioContext).currentTime,
        );
        sound._playStart = (Howler.ctx as HowlerAudioContext).currentTime;

        // Play the sound using the supported method.
        if (
          typeof ((node as HowlGainNode).bufferSource as AudioBufferSourceNode)
            .start === 'undefined'
        ) {
          sound._loop
            ? ((node as HowlGainNode).bufferSource as AudioBufferSourceNode)
                // @ts-expect-error Support older browsers.
                .noteGrainOn(0, seek, 86400)
            : ((node as HowlGainNode).bufferSource as AudioBufferSourceNode)
                // @ts-expect-error Support older browsers.
                .noteGrainOn(0, seek, duration);
        } else {
          sound._loop
            ? (
                (node as HowlGainNode).bufferSource as AudioBufferSourceNode
              ).start(0, seek, 86400)
            : (
                (node as HowlGainNode).bufferSource as AudioBufferSourceNode
              ).start(0, seek, duration);
        }

        // Start a new timer if none is present.
        if (timeout !== Infinity) {
          this._endTimers[sound._id] = setTimeout(
            this._ended.bind(this, sound),
            timeout,
          );
        }

        if (!internal) {
          setTimeout(() => {
            this._emit('play', sound._id);
            this._loadQueue();
          }, 0);
        }
      };

      if (
        Howler.state === 'running' &&
        (Howler.ctx as HowlerAudioContext).state !== 'interrupted'
      ) {
        playWebAudio();
      } else {
        this._playLock = true;

        // Wait for the audio context to resume before playing.
        this.once('resume', playWebAudio);

        // Cancel the end timer.
        this._clearTimer(sound._id);
      }
    } else {
      // Fire this when the sound is ready to play to begin HTML5 Audio playback.
      const playHtml5 = () => {
        node.currentTime = seek;
        (node as HTMLAudioElement).muted =
          sound._muted ||
          this._muted ||
          Howler._muted ||
          (node as HTMLAudioElement).muted;
        node.volume = sound._volume * (Howler.volume() as number);
        (node as HTMLAudioElement).playbackRate = sound._rate;

        // Some browsers will throw an error if this is called without user interaction.
        try {
          const play = (node as HTMLAudioElement).play();

          // Support older browsers that don't support promises, and thus don't have this issue.
          if (
            play &&
            typeof Promise !== 'undefined' &&
            // @ts-expect-error
            (play instanceof Promise || typeof play.then === 'function')
          ) {
            // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
            this._playLock = true;

            // Set param values immediately.
            setParams();

            // Releases the lock and executes queued actions.
            play
              .then(() => {
                this._playLock = false;
                (node as HowlerAudioElement)._unlocked = true;
                if (!internal) {
                  this._emit('play', sound._id);
                } else {
                  this._loadQueue();
                }
              })
              .catch(() => {
                this._playLock = false;
                this._emit(
                  'playerror',
                  sound._id,
                  'Playback was unable to start. This is most commonly an issue ' +
                    'on mobile devices and Chrome where playback was not within a user interaction.',
                );

                // Reset the ended and paused values.
                sound._ended = true;
                sound._paused = true;
              });
          } else if (!internal) {
            this._playLock = false;
            setParams();
            this._emit('play', sound._id);
          }

          // Setting rate before playing won't work in IE, so we set it again here.
          (node as HTMLAudioElement).playbackRate = sound._rate;

          // If the node is still paused, then we can assume there was a playback issue.
          if (node.paused) {
            this._emit(
              'playerror',
              sound._id,
              'Playback was unable to start. This is most commonly an issue ' +
                'on mobile devices and Chrome where playback was not within a user interaction.',
            );
            return;
          }

          // Setup the end timer on sprites or listen for the ended event.
          if (sprite !== '__default' || sound._loop) {
            this._endTimers[sound._id] = setTimeout(
              this._ended.bind(this, sound),
              timeout,
            );
          } else {
            this._endTimers[sound._id] = () => {
              // Fire ended on this audio node.
              this._ended(sound);

              // Clear this listener.
              node.removeEventListener(
                'ended',
                this._endTimers[sound._id],
                false,
              );
            };
            node.addEventListener('ended', this._endTimers[sound._id], false);
          }
        } catch (err) {
          this._emit('playerror', sound._id, err as any);
        }
      };

      // If this is streaming audio, make sure the src is set and load again.
      if (
        (node as HTMLAudioElement).src ===
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      ) {
        (node as HTMLAudioElement).src = this._src as string;
        (node as HTMLAudioElement).load();
      }

      // Play immediately if ready, or wait for the 'canplaythrough'event.
      const loadedNoReadyState =
        // @ts-expect-error Support old browsers
        (window && window.ejecta) ||
        // @ts-expect-error Support old browsers
        (!node.readyState && Howler._navigator.isCocoonJS);
      if ((node as HTMLAudioElement).readyState >= 3 || loadedNoReadyState) {
        playHtml5();
      } else {
        this._playLock = true;
        this._state = 'loading';

        const listener = () => {
          this._state = 'loaded';

          // Begin playback.
          playHtml5();

          // Clear this listener.
          node.removeEventListener(Howler._canPlayEvent, listener, false);
        };
        node.addEventListener(Howler._canPlayEvent, listener, false);

        // Cancel the end timer.
        this._clearTimer(sound._id);
      }
    }

    return sound._id;
  }

  /**
   * Pause playback and save current position.
   * @param id The sound ID (empty to pause all in group).
   * @param skipEmit If true, the `pause` event won't be emitted.
   */
  pause(id: number, skipEmit?: boolean) {
    // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'pause',
        action: () => {
          this.pause(id);
        },
      });

      return this;
    }

    // If no id is passed, get all ID's to be paused.
    var ids = this._getSoundIds(id);

    for (var i = 0; i < ids.length; i++) {
      // Clear the end timer.
      this._clearTimer(ids[i]);

      // Get the sound.
      var sound = this._soundById(ids[i]);

      if (sound && !sound._paused) {
        // Reset the seek position.
        sound._seek = this.seek(ids[i]) as number;
        sound._rateSeek = 0;
        sound._paused = true;

        // Stop currently running fades.
        this._stopFade(ids[i]);

        if (sound._node) {
          if (this._webAudio) {
            // Make sure the sound has been created.
            if (!(sound._node as HowlGainNode).bufferSource) {
              continue;
            }

            if (
              typeof (
                (sound._node as HowlGainNode)
                  .bufferSource as AudioBufferSourceNode
              ).stop === 'undefined'
            ) {
              (
                (sound._node as HowlGainNode)
                  .bufferSource as AudioBufferSourceNode
              )
                // @ts-expect-error Support older browsers.
                .noteOff(0);
            } else {
              (
                (sound._node as HowlGainNode)
                  .bufferSource as AudioBufferSourceNode
              ).stop(0);
            }

            // Clean up the buffer source.
            this._cleanBuffer(sound._node);
          } else if (
            !isNaN((sound._node as HTMLAudioElement).duration) ||
            (sound._node as HTMLAudioElement).duration === Infinity
          ) {
            (sound._node as HTMLAudioElement).pause();
          }
        }
      }

      // Fire the pause event, unless skipEmit is `true`
      if (!skipEmit) {
        this._emit('pause', sound ? sound._id : null);
      }
    }

    return this;
  }

  /**
   * Stop playback and reset to start.
   * @param id The sound ID (empty to stop all in group).
   * @param internal Internal Use: true prevents event firing.
   */
  stop(id?: number, internal?: boolean) {
    // If the sound hasn't loaded, add it to the load queue to stop when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'stop',
        action: () => {
          this.stop(id);
        },
      });

      return this;
    }

    // If no id is passed, get all ID's to be stopped.
    var ids = this._getSoundIds(id);

    for (var i = 0; i < ids.length; i++) {
      // Clear the end timer.
      this._clearTimer(ids[i]);

      // Get the sound.
      var sound = this._soundById(ids[i]);

      if (sound) {
        // Reset the seek position.
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._paused = true;
        sound._ended = true;

        // Stop currently running fades.
        this._stopFade(ids[i]);

        if (sound._node) {
          if (this._webAudio) {
            // Make sure the sound's AudioBufferSourceNode has been created.
            if ((sound._node as HowlGainNode).bufferSource) {
              if (
                typeof (
                  (sound._node as HowlGainNode)
                    .bufferSource as AudioBufferSourceNode
                ).stop === 'undefined'
              ) {
                (
                  (sound._node as HowlGainNode)
                    .bufferSource as AudioBufferSourceNode
                )
                  // @ts-expect-error Support older browsers
                  .noteOff(0);
              } else {
                (
                  (sound._node as HowlGainNode)
                    .bufferSource as AudioBufferSourceNode
                ).stop(0);
              }

              // Clean up the buffer source.
              this._cleanBuffer(sound._node);
            }
          } else if (
            !isNaN((sound._node as HTMLAudioElement).duration) ||
            (sound._node as HTMLAudioElement).duration === Infinity
          ) {
            sound._node.currentTime = sound._start || 0;
            (sound._node as HTMLAudioElement).pause();

            // If this is a live stream, stop download once the audio is stopped.
            if ((sound._node as HTMLAudioElement).duration === Infinity) {
              this._clearSound(sound._node);
            }
          }
        }

        if (!internal) {
          this._emit('stop', sound._id);
        }
      }
    }

    return this;
  }

  /**
   * Mute/unmute a single sound or all sounds in this Howl group.
   * @param muted Set to true to mute and false to unmute.
   * @param id    The sound ID to update (omit to mute/unmute all).
   */
  mute(muted: boolean, id: number) {
    // If the sound hasn't loaded, add it to the load queue to mute when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'mute',
        action: () => {
          this.mute(muted, id);
        },
      });

      return this;
    }

    // If applying mute/unmute to all sounds, update the group's value.
    if (typeof id === 'undefined') {
      if (typeof muted === 'boolean') {
        this._muted = muted;
      } else {
        return this._muted;
      }
    }

    // If no id is passed, get all ID's to be muted.
    var ids = this._getSoundIds(id);

    for (var i = 0; i < ids.length; i++) {
      // Get the sound.
      var sound = this._soundById(ids[i]);

      if (sound) {
        sound._muted = muted;

        // Cancel active fade and set the volume to the end value.
        if (sound._interval) {
          this._stopFade(sound._id);
        }

        if (this._webAudio && sound._node && Howler.ctx) {
          (sound._node as HowlGainNode).gain.setValueAtTime(
            muted ? 0 : sound._volume,
            Howler.ctx.currentTime,
          );
        } else if (sound._node) {
          (sound._node as HTMLAudioElement).muted = Howler._muted
            ? true
            : muted;
        }

        this._emit('mute', sound._id);
      }
    }

    return this;
  }

  /**
   * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
   *   volume() -> Returns the group's volume value.
   *   volume(id) -> Returns the sound id's current volume.
   *   volume(vol) -> Sets the volume of all sounds in this Howl group.
   *   volume(vol, id) -> Sets the volume of passed sound id.
   * @return Returns this or current volume.
   */
  volume(...args) {
    let vol, id;

    // Determine the values based on arguments.
    if (args.length === 0) {
      // Return the value of the groups' volume.
      return this._volume;
    } else if (
      args.length === 1 ||
      (args.length === 2 && typeof args[1] === 'undefined')
    ) {
      // First check if this is an ID, and if not, assume it is a new volume.
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else {
        vol = parseFloat(args[0]);
      }
    } else if (args.length >= 2) {
      vol = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }

    // Update the volume or return the current volume.
    let sound: Sound | null;
    if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
      // If the sound hasn't loaded, add it to the load queue to change volume when capable.
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'volume',
          action: () => {
            this.volume.apply(this, args);
          },
        });

        return this;
      }

      // Set the group volume.
      if (typeof id === 'undefined') {
        this._volume = vol;
      }

      // Update one or all volumes.
      id = this._getSoundIds(id);
      for (var i = 0; i < id.length; i++) {
        // Get the sound.
        sound = this._soundById(id[i]);

        if (sound) {
          sound._volume = vol;

          // Stop currently running fades.
          if (!args[2]) {
            this._stopFade(id[i]);
          }

          if (this._webAudio && sound._node && !sound._muted && Howler.ctx) {
            (sound._node as HowlGainNode).gain.setValueAtTime(
              vol,
              Howler.ctx.currentTime,
            );
          } else if (sound._node && !sound._muted) {
            sound._node.volume = vol * (Howler.volume() as number);
          }

          this._emit('volume', sound._id);
        }
      }
    } else {
      sound = id ? this._soundById(id) : this._sounds[0];
      return sound ? sound._volume : 0;
    }

    return this;
  }

  /**
   * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
   * @param from The value to fade from (0.0 to 1.0).
   * @param to   The volume to fade to (0.0 to 1.0).
   * @param len  Time in milliseconds to fade.
   * @param id   The sound id (omit to fade all sounds).
   */
  fade(
    from: number | string,
    to: number | string,
    len: number | string,
    id: number,
  ) {
    // If the sound hasn't loaded, add it to the load queue to fade when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'fade',
        action: () => {
          this.fade(from, to, len, id);
        },
      });

      return this;
    }

    // Make sure the to/from/len values are numbers.
    from = Math.min(Math.max(0, parseFloat(from as string)), 1);
    to = Math.min(Math.max(0, parseFloat(to as string)), 1);
    len = parseFloat(len as string);

    // Set the volume to the start position.
    this.volume(from, id);

    // Fade the volume of one or all sounds.
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      // Get the sound.
      var sound = this._soundById(ids[i]);

      // Create a linear fade or fall back to timeouts with HTML5 Audio.
      if (sound) {
        // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
        if (!id) {
          this._stopFade(ids[i]);
        }

        // If we are using Web Audio, let the native methods do the actual fade.
        if (this._webAudio && !sound._muted && Howler.ctx) {
          var currentTime = Howler.ctx.currentTime;
          var end = currentTime + len / 1000;
          sound._volume = from;
          (sound._node as HowlGainNode).gain.setValueAtTime(from, currentTime);
          (sound._node as HowlGainNode).gain.linearRampToValueAtTime(to, end);
        }

        this._startFadeInterval(
          sound,
          from,
          to,
          len,
          ids[i],
          typeof id === 'undefined',
        );
      }
    }

    return this;
  }

  /**
   * Starts the internal interval to fade a sound.
   * @param sound Reference to sound to fade.
   * @param from The value to fade from (0.0 to 1.0).
   * @param to   The volume to fade to (0.0 to 1.0).
   * @param len  Time in milliseconds to fade.
   * @param id   The sound id to fade.
   * @param isGroup   If true, set the volume on the group.
   */
  _startFadeInterval(
    sound: Sound,
    from: number,
    to: number,
    len: number,
    id: number,
    isGroup: boolean,
  ) {
    var vol = from;
    var diff = to - from;
    var steps = Math.abs(diff / 0.01);
    var stepLen = Math.max(4, steps > 0 ? len / steps : len);
    var lastTick = Date.now();

    // Store the value being faded to.
    sound._fadeTo = to;

    // Update the volume value on each interval tick.
    sound._interval = setInterval(() => {
      // Update the volume based on the time since the last tick.
      var tick = (Date.now() - lastTick) / len;
      lastTick = Date.now();
      vol += diff * tick;

      // Round to within 2 decimal points.
      vol = Math.round(vol * 100) / 100;

      // Make sure the volume is in the right bounds.
      if (diff < 0) {
        vol = Math.max(to, vol);
      } else {
        vol = Math.min(to, vol);
      }

      // Change the volume.
      if (this._webAudio) {
        sound._volume = vol;
      } else {
        this.volume(vol, sound._id, true);
      }

      // Set the group's volume.
      if (isGroup) {
        this._volume = vol;
      }

      // When the fade is complete, stop it and fire event.
      if ((to < from && vol <= to) || (to > from && vol >= to)) {
        if (typeof sound._interval === 'number') {
          clearInterval(sound._interval);
        }
        sound._interval = null;
        sound._fadeTo = null;
        this.volume(to, sound._id);
        this._emit('fade', sound._id);
      }
    }, stepLen);
  }

  /**
   * Internal method that stops the currently playing fade when
   * a new fade starts, volume is changed or the sound is stopped.
   * @param  {Number} id The sound id.
   * @return {Howl}
   */
  _stopFade(id) {
    var sound = this._soundById(id);

    if (sound && sound._interval) {
      if (this._webAudio && Howler.ctx) {
        (sound._node as HowlGainNode).gain.cancelScheduledValues(
          Howler.ctx.currentTime,
        );
      }

      clearInterval(sound._interval);
      sound._interval = null;
      this.volume(sound._fadeTo, id);
      sound._fadeTo = null;
      this._emit('fade', id);
    }

    return this;
  }

  /**
   * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
   *   loop() -> Returns the group's loop value.
   *   loop(id) -> Returns the sound id's loop value.
   *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
   *   loop(loop, id) -> Sets the loop value of passed sound id.
   * @return Returns this or current loop value.
   */
  loop(...args) {
    let loop, id, sound;

    // Determine the values for loop and id.
    if (args.length === 0) {
      // Return the grou's loop value.
      return this._loop;
    } else if (args.length === 1) {
      if (typeof args[0] === 'boolean') {
        loop = args[0];
        this._loop = loop;
      } else {
        // Return this sound's loop value.
        sound = this._soundById(parseInt(args[0], 10));
        return sound ? sound._loop : false;
      }
    } else if (args.length === 2) {
      loop = args[0];
      id = parseInt(args[1], 10);
    }

    // If no id is passed, get all ID's to be looped.
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      sound = this._soundById(ids[i]);

      if (sound) {
        sound._loop = loop;
        if (this._webAudio && sound._node && sound._node.bufferSource) {
          sound._node.bufferSource.loop = loop;
          if (loop) {
            sound._node.bufferSource.loopStart = sound._start || 0;
            sound._node.bufferSource.loopEnd = sound._stop;

            // If playing, restart playback to ensure looping updates.
            if (this.playing(ids[i])) {
              this.pause(ids[i], true);
              this.play(ids[i], true);
            }
          }
        }
      }
    }

    return this;
  }

  /**
   * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
   *   rate() -> Returns the first sound node's current playback rate.
   *   rate(id) -> Returns the sound id's current playback rate.
   *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
   *   rate(rate, id) -> Sets the playback rate of passed sound id.
   * @return Returns this or the current playback rate.
   */
  rate(...args) {
    let rate, id;

    // Determine the values based on arguments.
    if (args.length === 0) {
      // We will simply return the current rate of the first node.
      id = this._sounds[0]._id;
    } else if (args.length === 1) {
      // First check if this is an ID, and if not, assume it is a new rate value.
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else {
        rate = parseFloat(args[0]);
      }
    } else if (args.length === 2) {
      rate = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }

    // Update the playback rate or return the current value.
    let sound;
    if (typeof rate === 'number') {
      // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'rate',
          action: () => {
            this.rate.apply(this, args);
          },
        });

        return this;
      }

      // Set the group rate.
      if (typeof id === 'undefined') {
        this._rate = rate;
      }

      // Update one or all volumes.
      id = this._getSoundIds(id);
      for (var i = 0; i < id.length; i++) {
        // Get the sound.
        sound = this._soundById(id[i]);

        if (sound && Howler.ctx) {
          // Keep track of our position when the rate changed and update the playback
          // start position so we can properly adjust the seek position for time elapsed.
          if (this.playing(id[i])) {
            sound._rateSeek = this.seek(id[i]);
            sound._playStart = this._webAudio
              ? Howler.ctx.currentTime
              : sound._playStart;
          }
          sound._rate = rate;

          // Change the playback rate.
          if (this._webAudio && sound._node && sound._node.bufferSource) {
            sound._node.bufferSource.playbackRate.setValueAtTime(
              rate,
              Howler.ctx.currentTime,
            );
          } else if (sound._node) {
            sound._node.playbackRate = rate;
          }

          // Reset the timers.
          const seek = this.seek(id[i]) as number;
          const duration =
            (this._sprite[sound._sprite][0] + this._sprite[sound._sprite][1]) /
              1000 -
            seek;
          const timeout = (duration * 1000) / Math.abs(sound._rate);

          // Start a new end timer if sound is already playing.
          if (this._endTimers[id[i]] || !sound._paused) {
            this._clearTimer(id[i]);
            this._endTimers[id[i]] = setTimeout(
              this._ended.bind(this, sound),
              timeout,
            );
          }

          this._emit('rate', sound._id);
        }
      }
    } else {
      sound = this._soundById(id);
      return sound ? sound._rate : this._rate;
    }

    return this;
  }

  /**
   * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
   *   seek() -> Returns the first sound node's current seek position.
   *   seek(id) -> Returns the sound id's current seek position.
   *   seek(seek) -> Sets the seek position of the first sound node.
   *   seek(seek, id) -> Sets the seek position of passed sound id.
   * @return Returns this or the current seek position.
   */
  seek(...args) {
    let seek, id;

    // Determine the values based on arguments.
    if (args.length === 0) {
      // We will simply return the current position of the first node.
      if (this._sounds.length) {
        id = this._sounds[0]._id;
      }
    } else if (args.length === 1) {
      // First check if this is an ID, and if not, assume it is a new seek position.
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else if (this._sounds.length) {
        id = this._sounds[0]._id;
        seek = parseFloat(args[0]);
      }
    } else if (args.length === 2) {
      seek = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }

    // If there is no ID, bail out.
    if (typeof id === 'undefined') {
      return 0;
    }

    // If the sound hasn't loaded, add it to the load queue to seek when capable.
    if (
      typeof seek === 'number' &&
      (this._state !== 'loaded' || this._playLock)
    ) {
      this._queue.push({
        event: 'seek',
        action: () => {
          this.seek.apply(this, args);
        },
      });

      return this;
    }

    // Get the sound.
    var sound = this._soundById(id);

    if (sound) {
      if (typeof seek === 'number' && seek >= 0) {
        // Pause the sound and update position for restarting playback.
        var playing = this.playing(id);
        if (playing) {
          this.pause(id, true);
        }

        // Move the position of the track and cancel timer.
        sound._seek = seek;
        sound._ended = false;
        this._clearTimer(id);

        // Update the seek position for HTML5 Audio.
        if (
          !this._webAudio &&
          sound._node &&
          !isNaN((sound._node as HTMLAudioElement).duration)
        ) {
          sound._node.currentTime = seek;
        }

        // Seek and emit when ready.
        const seekAndEmit = () => {
          // Restart the playback if the sound was playing.
          if (playing) {
            this.play(id, true);
          }

          this._emit('seek', id);
        };

        // Wait for the play lock to be unset before emitting (HTML5 Audio).
        if (playing && !this._webAudio) {
          const emitSeek = () => {
            if (!this._playLock) {
              seekAndEmit();
            } else {
              setTimeout(emitSeek, 0);
            }
          };
          setTimeout(emitSeek, 0);
        } else {
          seekAndEmit();
        }
      } else {
        if (this._webAudio && Howler.ctx) {
          const realTime = this.playing(id)
            ? Howler.ctx.currentTime - sound._playStart
            : 0;
          const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
          return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
        } else {
          return sound._node.currentTime;
        }
      }
    }

    return this;
  }

  /**
   * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
   * @param id The sound id to check. If none is passed, the whole sound group is checked.
   * @return True if playing and false if not.
   */
  playing(id: number) {
    // Check the passed sound ID (if any).
    if (typeof id === 'number') {
      var sound = this._soundById(id);
      return sound ? !sound._paused : false;
    }

    // Otherwise, loop through all sounds and check if any are playing.
    for (var i = 0; i < this._sounds.length; i++) {
      if (!this._sounds[i]._paused) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the duration of this sound. Passing a sound id will return the sprite duration.
   * @param id The sound id to check. If none is passed, return full source duration.
   * @return Audio duration in seconds.
   */
  duration(id: number) {
    var duration = this._duration;

    // If we pass an ID, get the sound and return the sprite length.
    var sound = this._soundById(id);
    if (sound) {
      duration = this._sprite[sound._sprite][1] / 1000;
    }

    return duration;
  }

  /**
   * Returns the current loaded state of this Howl.
   * @return 'unloaded', 'loading', 'loaded'
   */
  state() {
    return this._state;
  }

  /**
   * Unload and destroy the current Howl object.
   * This will immediately stop all sound instances attached to this group.
   */
  unload() {
    // Stop playing any active sounds.
    var sounds = this._sounds;
    for (let i = 0; i < sounds.length; i++) {
      // Stop the sound if it is currently playing.
      if (!sounds[i]._paused) {
        this.stop(sounds[i]._id);
      }

      // Remove the source or disconnect.
      if (!this._webAudio) {
        // Set the source to 0-second silence to stop any downloading (except in IE).
        this._clearSound(sounds[i]._node);

        // Remove any event listeners.
        sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
        sounds[i]._node.removeEventListener(
          Howler._canPlayEvent,
          sounds[i]._loadFn,
          false,
        );
        sounds[i]._node.removeEventListener('ended', sounds[i]._endFn, false);

        // Release the Audio object back to the pool.
        Howler._releaseHtml5Audio(sounds[i]._node as HowlerAudioElement);
      }

      // Empty out all of the nodes.
      // @ts-expect-error Disable type checking to avoid dynamic edge case.
      delete sounds[i]._node;

      // Make sure all timers are cleared out.
      this._clearTimer(sounds[i]._id);
    }

    // Remove the references in the global Howler object.
    var index = Howler._howls.indexOf(this);
    if (index >= 0) {
      Howler._howls.splice(index, 1);
    }

    // Delete this sound from the cache (if no other Howl is using it).
    var remCache = true;
    for (let i = 0; i < Howler._howls.length; i++) {
      if (
        Howler._howls[i]._src === this._src ||
        this._src.indexOf(Howler._howls[i]._src as string) >= 0
      ) {
        remCache = false;
        break;
      }
    }

    if (cache && remCache) {
      delete cache[this._src as string];
    }

    // Clear global errors.
    Howler.noAudio = false;

    // Clear out `this`.
    this._state = 'unloaded';
    this._sounds = [];
    // NOTE: This is operation is not allowed in modern TS + JS. Don't know how to replace it though.
    // this = null;

    return null;
  }

  /**
   * Listen to a custom event.
   * @param  {String}   event Event name.
   * @param  {Function} fn    Listener to call.
   * @param  {Number}   id    (optional) Only listen to events for this sound.
   * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
   */
  on(event: string, fn: Function, id?: number, once?: number) {
    var events = this['_on' + event];

    if (typeof fn === 'function') {
      events.push(once ? { id: id, fn: fn, once: once } : { id: id, fn: fn });
    }

    return this;
  }

  /**
   * Remove a custom event. Call without parameters to remove all events.
   * @param  {String}   event Event name.
   * @param  {Function} fn    Listener to remove. Leave empty to remove all.
   * @param  {Number}   id    (optional) Only remove events for this sound.
   * @return {Howl}
   */
  off(event, fn, id) {
    var events = this['_on' + event];
    var i = 0;

    // Allow passing just an event and ID.
    if (typeof fn === 'number') {
      id = fn;
      fn = null;
    }

    if (fn || id) {
      // Loop through event store and remove the passed function.
      for (i = 0; i < events.length; i++) {
        var isId = id === events[i].id;
        if ((fn === events[i].fn && isId) || (!fn && isId)) {
          events.splice(i, 1);
          break;
        }
      }
    } else if (event) {
      // Clear out all events of this type.
      this['_on' + event] = [];
    } else {
      // Clear out all events of every type.
      var keys = Object.keys(this);
      for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('_on') === 0 && Array.isArray(this[keys[i]])) {
          this[keys[i]] = [];
        }
      }
    }

    return this;
  }

  /**
   * Listen to a custom event and remove it once fired.
   * @param event Event name.
   * @param fn    Listener to call.
   * @param id    (optional) Only listen to events for this sound.
   */
  once(event: string, fn: Function, id?: number) {
    // Setup the event listener.
    this.on(event, fn, id, 1);

    return this;
  }

  /**
   * Emit all events of a specific type and pass the sound id.
   * @param event Event name.
   * @param id    Sound ID.
   * @param msg   Message to go with event.
   */
  _emit(event: string, id?: number | null, msg?: string | number) {
    var events = this['_on' + event];

    // Loop through event store and fire all functions.
    for (var i = events.length - 1; i >= 0; i--) {
      // Only fire the listener if the correct ID is used.
      if (!events[i].id || events[i].id === id || event === 'load') {
        setTimeout(
          ((fn) => {
            fn.call(this, id, msg);
          }).bind(this, events[i].fn),
          0,
        );

        // If this event was setup with `once`, remove it.
        if (events[i].once) {
          this.off(event, events[i].fn, events[i].id);
        }
      }
    }

    // Pass the event type into load queue so that it can continue stepping.
    this._loadQueue(event);

    return this;
  }

  /**
   * Queue of actions initiated before the sound has loaded.
   * These will be called in sequence, with the next only firing
   * after the previous has finished executing (even if async like play).
   */
  _loadQueue(event?: string) {
    if (this._queue.length > 0) {
      var task = this._queue[0];

      // Remove this task if a matching event was passed.
      if (task.event === event) {
        this._queue.shift();
        this._loadQueue();
      }

      // Run the task if no event type is passed.
      if (!event) {
        task.action();
      }
    }

    return this;
  }

  /**
   * Fired when playback ends at the end of the duration.
   * @param sound The sound object to work with.
   */
  _ended(sound: Sound) {
    var sprite = sound._sprite;

    // If we are using IE and there was network latency we may be clipping
    // audio before it completes playing. Lets check the node to make sure it
    // believes it has completed, before ending the playback.
    if (
      !this._webAudio &&
      sound._node &&
      !sound._node.paused &&
      !(sound._node as HowlerAudioElement).ended &&
      sound._node.currentTime < sound._stop
    ) {
      setTimeout(this._ended.bind(this, sound), 100);
      return this;
    }

    // Should this sound loop?
    var loop = !!(sound._loop || this._sprite[sprite][2]);

    // Fire the ended event.
    this._emit('end', sound._id);

    // Restart the playback for HTML5 Audio loop.
    if (!this._webAudio && loop) {
      this.stop(sound._id, true).play(sound._id);
    }

    // Restart this timer if on a Web Audio loop.
    if (this._webAudio && loop && Howler.ctx) {
      this._emit('play', sound._id);
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      sound._playStart = Howler.ctx.currentTime;

      var timeout =
        ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
      this._endTimers[sound._id] = setTimeout(
        this._ended.bind(this, sound),
        timeout,
      );
    }

    // Mark the node as paused.
    if (this._webAudio && !loop) {
      sound._paused = true;
      sound._ended = true;
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      this._clearTimer(sound._id);

      // Clean up the buffer source.
      this._cleanBuffer(sound._node);

      // Attempt to auto-suspend AudioContext if no sounds are still playing.
      Howler._autoSuspend();
    }

    // When using a sprite, end the track.
    if (!this._webAudio && !loop) {
      this.stop(sound._id, true);
    }

    return this;
  }

  /**
   * Clear the end timer for a sound playback.
   * @param  {Number} id The sound ID.
   */
  _clearTimer(id: number) {
    if (this._endTimers[id]) {
      // Clear the timeout or remove the ended listener.
      if (typeof this._endTimers[id] !== 'function') {
        clearTimeout(this._endTimers[id]);
      } else {
        var sound = this._soundById(id);
        if (sound && sound._node) {
          sound._node.removeEventListener('ended', this._endTimers[id], false);
        }
      }

      delete this._endTimers[id];
    }

    return this;
  }
  /**
   * Return the sound identified by this ID, or return null.
   * @param id Sound ID
   * @return Sound object or null.
   */
  _soundById(id: number) {
    // Loop through all sounds and find the one with this ID.
    for (var i = 0; i < this._sounds.length; i++) {
      if (id === this._sounds[i]._id) {
        return this._sounds[i];
      }
    }

    return null;
  }

  /**
   * Return an inactive sound from the pool or create a new one.
   * @return Sound playback object.
   */
  _inactiveSound() {
    this._drain();

    // Find the first inactive node to recycle.
    for (let i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        return this._sounds[i].reset();
      }
    }

    // If no inactive node was found, create a new one.
    return new Sound(this);
  }

  /**
   * Drain excess inactive sounds from the pool.
   */
  _drain() {
    const limit = this._pool;
    let cnt = 0;
    let i = 0;

    // If there are less sounds than the max pool size, we are done.
    if (this._sounds.length < limit) {
      return;
    }

    // Count the number of inactive sounds.
    for (i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        cnt++;
      }
    }

    // Remove excess inactive sounds, going in reverse order.
    for (i = this._sounds.length - 1; i >= 0; i--) {
      if (cnt <= limit) {
        return;
      }

      if (this._sounds[i]._ended) {
        // Disconnect the audio source when using Web Audio.
        if (this._webAudio && this._sounds[i]._node) {
          (this._sounds[i]._node as HowlGainNode).disconnect(0);
        }

        // Remove sounds until we have the pool size.
        this._sounds.splice(i, 1);
        cnt--;
      }
    }
  }

  /**
   * Get all ID's from the sounds pool.
   * @param id Only return one ID if one is passed.
   * @return Array of IDs.
   */
  _getSoundIds(id?: number) {
    if (typeof id === 'undefined') {
      var ids: number[] = [];
      for (var i = 0; i < this._sounds.length; i++) {
        ids.push(this._sounds[i]._id);
      }

      return ids;
    } else {
      return [id];
    }
  }

  /**
   * Load the sound back into the buffer source.
   * @param sound The sound object to work with.
   */
  _refreshBuffer(sound: Sound) {
    // Setup the buffer source for playback.
    (sound._node as HowlGainNode).bufferSource = (
      Howler.ctx as HowlerAudioContext
    ).createBufferSource();
    (
      (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
    ).buffer = cache[this._src as string];

    // Connect to the correct node.
    if (sound._panner) {
      (
        (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
      ).connect(sound._panner);
    } else {
      (
        (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
      ).connect(sound._node as HowlGainNode);
    }

    // Setup looping and playback rate.
    ((sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode).loop =
      sound._loop;
    if (sound._loop) {
      (
        (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
      ).loopStart = sound._start || 0;
      (
        (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
      ).loopEnd = sound._stop || 0;
    }
    (
      (sound._node as HowlGainNode).bufferSource as AudioBufferSourceNode
    ).playbackRate.setValueAtTime(
      sound._rate,
      (Howler.ctx as HowlerAudioContext).currentTime,
    );

    return this;
  }

  /**
   * Prevent memory leaks by cleaning up the buffer source after playback.
   * @param  {Object} node Sound's audio node containing the buffer source.
   * @return {Howl}
   */
  _cleanBuffer(node: Sound['_node']) {
    var isIOS =
      Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;

    if (Howler._scratchBuffer && (node as HowlGainNode).bufferSource) {
      ((node as HowlGainNode).bufferSource as AudioBufferSourceNode).onended =
        null;
      ((node as HowlGainNode).bufferSource as AudioBufferSourceNode).disconnect(
        0,
      );
      if (isIOS) {
        try {
          (
            (node as HowlGainNode).bufferSource as AudioBufferSourceNode
          ).buffer = Howler._scratchBuffer;
        } catch (e) {}
      }
    }
    (node as HowlGainNode).bufferSource = null;

    return this;
  }

  /**
   * Set the source to a 0-second silence to stop any downloading (except in IE).
   * @param  {Object} node Audio node to clear.
   */
  _clearSound(node) {
    var checkIE = /MSIE |Trident\//.test(
      Howler._navigator && Howler._navigator.userAgent,
    );
    if (!checkIE) {
      node.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    }
  }
}

export default Howl;
