import Howler from './howler';
import { loadBuffer } from './helpers';
import Sound from './sound';

class Howl {
  /**
   * Create an audio group controller.
   * @param {Object} o Passed in properties for this group.
   */
  constructor(o) {
    // Throw an error if no source is provided.
    if (!o.src || o.src.length === 0) {
      console.error(
        'An array of source files must be passed with any new Howl.',
      );
      return;
    }

    this.init(o);
  }

  /**
   * Initialize a new Howl group object.
   * @param  {Object} o Passed in properties for this group.
   * @return {Howl}
   */
  init(o) {
    // If we don't have an AudioContext created yet, run the setup.
    if (!Howler.ctx) {
      Howler._setupAudioContext();
    }

    // Setup user-defined default properties.
    this._autoplay = o.autoplay || false;
    this._format = typeof o.format !== 'string' ? o.format : [o.format];
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
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : null,
      withCredentials:
        o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
    };

    // Setup all other default properties.
    this._duration = 0;
    this._state = 'unloaded';
    this._sounds = [];
    this._endTimers = {};
    this._queue = [];
    this._playLock = false;

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
        action() {
          this.play();
        },
      });
    }

    // Load the source file unless otherwise specified.
    if (this._preload && this._preload !== 'none') {
      this.load();
    }

    return this;
  }

  /**
   * Load the audio file.
   * @return {Howler}
   */
  load() {
    var url = null;

    // If no audio is available, quit immediately.
    if (Howler.noAudio) {
      this._emit('loaderror', null, 'No audio support.');
      return;
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
      return;
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
   * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
   * @param  {Boolean} internal Internal Use: true prevents event firing.
   * @return {Number}          Sound ID.
   */
  play(sprite, internal) {
    var id = null;

    // Determine if a sprite, sound id or nothing was passed
    if (typeof sprite === 'number') {
      id = sprite;
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
          sprite = null;
        } else {
          id = null;
        }
      }
    }

    // Get the selected node, or get one from the pool.
    var sound = id ? this._soundById(id) : this._inactiveSound();

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
      sound._sprite = sprite;

      // Mark this sound as not ended in case another sound is played before this one loads.
      sound._ended = false;

      // Add the sound to the queue to be played on load.
      var soundId = sound._id;
      this._queue.push({
        event: 'play',
        action() {
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
    var seek = Math.max(
      0,
      sound._seek > 0 ? sound._seek : this._sprite[sprite][0] / 1000,
    );
    var duration = Math.max(
      0,
      (this._sprite[sprite][0] + this._sprite[sprite][1]) / 1000 - seek,
    );
    var timeout = (duration * 1000) / Math.abs(sound._rate);
    var start = this._sprite[sprite][0] / 1000;
    var stop = (this._sprite[sprite][0] + this._sprite[sprite][1]) / 1000;
    sound._sprite = sprite;

    // Mark the sound as ended instantly so that this async playback
    // doesn't get grabbed by another call to play while this one waits to start.
    sound._ended = false;

    // Update the parameters of the sound.
    var setParams = function () {
      sound._paused = false;
      sound._seek = seek;
      sound._start = start;
      sound._stop = stop;
      sound._loop = !!(sound._loop || this._sprite[sprite][2]);
    };

    // End the sound instantly if seek is at the end.
    if (seek >= stop) {
      this._ended(sound);
      return;
    }

    // Begin the actual playback.
    var node = sound._node;
    if (this._webAudio) {
      // Fire this when the sound is ready to play to begin Web Audio playback.
      var playWebAudio = function () {
        this._playLock = false;
        setParams();
        this._refreshBuffer(sound);

        // Setup the playback params.
        var vol = sound._muted || this._muted ? 0 : sound._volume;
        node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
        sound._playStart = Howler.ctx.currentTime;

        // Play the sound using the supported method.
        if (typeof node.bufferSource.start === 'undefined') {
          sound._loop
            ? node.bufferSource.noteGrainOn(0, seek, 86400)
            : node.bufferSource.noteGrainOn(0, seek, duration);
        } else {
          sound._loop
            ? node.bufferSource.start(0, seek, 86400)
            : node.bufferSource.start(0, seek, duration);
        }

        // Start a new timer if none is present.
        if (timeout !== Infinity) {
          this._endTimers[sound._id] = setTimeout(
            this._ended.bind(this, sound),
            timeout,
          );
        }

        if (!internal) {
          setTimeout(function () {
            this._emit('play', sound._id);
            this._loadQueue();
          }, 0);
        }
      };

      if (Howler.state === 'running' && Howler.ctx.state !== 'interrupted') {
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
      var playHtml5 = function () {
        node.currentTime = seek;
        node.muted = sound._muted || this._muted || Howler._muted || node.muted;
        node.volume = sound._volume * Howler.volume();
        node.playbackRate = sound._rate;

        // Some browsers will throw an error if this is called without user interaction.
        try {
          var play = node.play();

          // Support older browsers that don't support promises, and thus don't have this issue.
          if (
            play &&
            typeof Promise !== 'undefined' &&
            (play instanceof Promise || typeof play.then === 'function')
          ) {
            // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
            this._playLock = true;

            // Set param values immediately.
            setParams();

            // Releases the lock and executes queued actions.
            play
              .then(function () {
                this._playLock = false;
                node._unlocked = true;
                if (!internal) {
                  this._emit('play', sound._id);
                } else {
                  this._loadQueue();
                }
              })
              .catch(function () {
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
          node.playbackRate = sound._rate;

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
            this._endTimers[sound._id] = function () {
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
          this._emit('playerror', sound._id, err);
        }
      };

      // If this is streaming audio, make sure the src is set and load again.
      if (
        node.src ===
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      ) {
        node.src = this._src;
        node.load();
      }

      // Play immediately if ready, or wait for the 'canplaythrough'e vent.
      var loadedNoReadyState =
        (window && window.ejecta) ||
        (!node.readyState && Howler._navigator.isCocoonJS);
      if (node.readyState >= 3 || loadedNoReadyState) {
        playHtml5();
      } else {
        this._playLock = true;
        this._state = 'loading';

        var listener = function () {
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
   * @param  {Number} id The sound ID (empty to pause all in group).
   * @return {Howl}
   */
  pause(id) {
    // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'pause',
        action() {
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
        sound._seek = this.seek(ids[i]);
        sound._rateSeek = 0;
        sound._paused = true;

        // Stop currently running fades.
        this._stopFade(ids[i]);

        if (sound._node) {
          if (this._webAudio) {
            // Make sure the sound has been created.
            if (!sound._node.bufferSource) {
              continue;
            }

            if (typeof sound._node.bufferSource.stop === 'undefined') {
              sound._node.bufferSource.noteOff(0);
            } else {
              sound._node.bufferSource.stop(0);
            }

            // Clean up the buffer source.
            this._cleanBuffer(sound._node);
          } else if (
            !isNaN(sound._node.duration) ||
            sound._node.duration === Infinity
          ) {
            sound._node.pause();
          }
        }
      }

      // Fire the pause event, unless `true` is passed as the 2nd argument.
      if (!arguments[1]) {
        this._emit('pause', sound ? sound._id : null);
      }
    }

    return this;
  }

  /**
   * Stop playback and reset to start.
   * @param  {Number} id The sound ID (empty to stop all in group).
   * @param  {Boolean} internal Internal Use: true prevents event firing.
   * @return {Howl}
   */
  stop(id, internal) {
    // If the sound hasn't loaded, add it to the load queue to stop when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'stop',
        action() {
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
            if (sound._node.bufferSource) {
              if (typeof sound._node.bufferSource.stop === 'undefined') {
                sound._node.bufferSource.noteOff(0);
              } else {
                sound._node.bufferSource.stop(0);
              }

              // Clean up the buffer source.
              this._cleanBuffer(sound._node);
            }
          } else if (
            !isNaN(sound._node.duration) ||
            sound._node.duration === Infinity
          ) {
            sound._node.currentTime = sound._start || 0;
            sound._node.pause();

            // If this is a live stream, stop download once the audio is stopped.
            if (sound._node.duration === Infinity) {
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
   * @param  {Boolean} muted Set to true to mute and false to unmute.
   * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
   * @return {Howl}
   */
  mute(muted, id) {
    // If the sound hasn't loaded, add it to the load queue to mute when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'mute',
        action() {
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

        if (this._webAudio && sound._node) {
          sound._node.gain.setValueAtTime(
            muted ? 0 : sound._volume,
            Howler.ctx.currentTime,
          );
        } else if (sound._node) {
          sound._node.muted = Howler._muted ? true : muted;
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
   * @return {Howl/Number} Returns this or current volume.
   */
  volume() {
    var args = arguments;
    var vol, id;

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
    var sound;
    if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
      // If the sound hasn't loaded, add it to the load queue to change volume when capable.
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'volume',
          action() {
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

          if (this._webAudio && sound._node && !sound._muted) {
            sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
          } else if (sound._node && !sound._muted) {
            sound._node.volume = vol * Howler.volume();
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
   * @param  {Number} from The value to fade from (0.0 to 1.0).
   * @param  {Number} to   The volume to fade to (0.0 to 1.0).
   * @param  {Number} len  Time in milliseconds to fade.
   * @param  {Number} id   The sound id (omit to fade all sounds).
   * @return {Howl}
   */
  fade(from, to, len, id) {
    // If the sound hasn't loaded, add it to the load queue to fade when capable.
    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'fade',
        action() {
          this.fade(from, to, len, id);
        },
      });

      return this;
    }

    // Make sure the to/from/len values are numbers.
    from = Math.min(Math.max(0, parseFloat(from)), 1);
    to = Math.min(Math.max(0, parseFloat(to)), 1);
    len = parseFloat(len);

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
        if (this._webAudio && !sound._muted) {
          var currentTime = Howler.ctx.currentTime;
          var end = currentTime + len / 1000;
          sound._volume = from;
          sound._node.gain.setValueAtTime(from, currentTime);
          sound._node.gain.linearRampToValueAtTime(to, end);
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
   * @param  {Object} sound Reference to sound to fade.
   * @param  {Number} from The value to fade from (0.0 to 1.0).
   * @param  {Number} to   The volume to fade to (0.0 to 1.0).
   * @param  {Number} len  Time in milliseconds to fade.
   * @param  {Number} id   The sound id to fade.
   * @param  {Boolean} isGroup   If true, set the volume on the group.
   */
  _startFadeInterval(sound, from, to, len, id, isGroup) {
    var vol = from;
    var diff = to - from;
    var steps = Math.abs(diff / 0.01);
    var stepLen = Math.max(4, steps > 0 ? len / steps : len);
    var lastTick = Date.now();

    // Store the value being faded to.
    sound._fadeTo = to;

    // Update the volume value on each interval tick.
    sound._interval = setInterval(function () {
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
        clearInterval(sound._interval);
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
      if (this._webAudio) {
        sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
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
   * @return {Howl/Boolean} Returns this or current loop value.
   */
  loop() {
    var args = arguments;
    var loop, id, sound;

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
   * @return {Howl/Number} Returns this or the current playback rate.
   */
  rate() {
    var args = arguments;
    var rate, id;

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
    var sound;
    if (typeof rate === 'number') {
      // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'rate',
          action() {
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

        if (sound) {
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
          var seek = this.seek(id[i]);
          var duration =
            (this._sprite[sound._sprite][0] + this._sprite[sound._sprite][1]) /
              1000 -
            seek;
          var timeout = (duration * 1000) / Math.abs(sound._rate);

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
   * @return {Howl/Number} Returns this or the current seek position.
   */
  seek() {
    var args = arguments;
    var seek, id;

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
        action() {
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
        if (!this._webAudio && sound._node && !isNaN(sound._node.duration)) {
          sound._node.currentTime = seek;
        }

        // Seek and emit when ready.
        var seekAndEmit = function () {
          // Restart the playback if the sound was playing.
          if (playing) {
            this.play(id, true);
          }

          this._emit('seek', id);
        };

        // Wait for the play lock to be unset before emitting (HTML5 Audio).
        if (playing && !this._webAudio) {
          var emitSeek = function () {
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
        if (this._webAudio) {
          var realTime = this.playing(id)
            ? Howler.ctx.currentTime - sound._playStart
            : 0;
          var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
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
   * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
   * @return {Boolean} True if playing and false if not.
   */
  playing(id) {
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
   * @param  {Number} id The sound id to check. If none is passed, return full source duration.
   * @return {Number} Audio duration in seconds.
   */
  duration(id) {
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
   * @return {String} 'unloaded', 'loading', 'loaded'
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
    for (var i = 0; i < sounds.length; i++) {
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
        Howler._releaseHtml5Audio(sounds[i]._node);
      }

      // Empty out all of the nodes.
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
    for (i = 0; i < Howler._howls.length; i++) {
      if (
        Howler._howls[i]._src === this._src ||
        this._src.indexOf(Howler._howls[i]._src) >= 0
      ) {
        remCache = false;
        break;
      }
    }

    if (cache && remCache) {
      delete cache[this._src];
    }

    // Clear global errors.
    Howler.noAudio = false;

    // Clear out `this`.
    this._state = 'unloaded';
    this._sounds = [];
    this = null;

    return null;
  }

  /**
   * Listen to a custom event.
   * @param  {String}   event Event name.
   * @param  {Function} fn    Listener to call.
   * @param  {Number}   id    (optional) Only listen to events for this sound.
   * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
   * @return {Howl}
   */
  on(event, fn, id, once) {
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
   * @param  {String}   event Event name.
   * @param  {Function} fn    Listener to call.
   * @param  {Number}   id    (optional) Only listen to events for this sound.
   * @return {Howl}
   */
  once(event, fn, id) {
    // Setup the event listener.
    this.on(event, fn, id, 1);

    return this;
  }

  /**
   * Emit all events of a specific type and pass the sound id.
   * @param  {String} event Event name.
   * @param  {Number} id    Sound ID.
   * @param  {Number} msg   Message to go with event.
   * @return {Howl}
   */
  _emit(event, id, msg) {
    var events = this['_on' + event];

    // Loop through event store and fire all functions.
    for (var i = events.length - 1; i >= 0; i--) {
      // Only fire the listener if the correct ID is used.
      if (!events[i].id || events[i].id === id || event === 'load') {
        setTimeout(
          function (fn) {
            fn.call(this, id, msg);
          }.bind(this, events[i].fn),
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
   * @return {Howl}
   */
  _loadQueue(event) {
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
   * @param  {Sound} sound The sound object to work with.
   * @return {Howl}
   */
  _ended(sound) {
    var sprite = sound._sprite;

    // If we are using IE and there was network latency we may be clipping
    // audio before it completes playing. Lets check the node to make sure it
    // believes it has completed, before ending the playback.
    if (
      !this._webAudio &&
      sound._node &&
      !sound._node.paused &&
      !sound._node.ended &&
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
    if (this._webAudio && loop) {
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
   * @return {Howl}
   */
  _clearTimer(id) {
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
   * @param  {Number} id Sound ID
   * @return {Object}    Sound object or null.
   */
  _soundById(id) {
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
   * @return {Sound} Sound playback object.
   */
  _inactiveSound() {
    this._drain();

    // Find the first inactive node to recycle.
    for (var i = 0; i < this._sounds.length; i++) {
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
    var limit = this._pool;
    var cnt = 0;
    var i = 0;

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
          this._sounds[i]._node.disconnect(0);
        }

        // Remove sounds until we have the pool size.
        this._sounds.splice(i, 1);
        cnt--;
      }
    }
  }

  /**
   * Get all ID's from the sounds pool.
   * @param  {Number} id Only return one ID if one is passed.
   * @return {Array}    Array of IDs.
   */
  _getSoundIds(id) {
    if (typeof id === 'undefined') {
      var ids = [];
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
   * @param  {Sound} sound The sound object to work with.
   * @return {Howl}
   */
  _refreshBuffer(sound) {
    // Setup the buffer source for playback.
    sound._node.bufferSource = Howler.ctx.createBufferSource();
    sound._node.bufferSource.buffer = cache[this._src];

    // Connect to the correct node.
    if (sound._panner) {
      sound._node.bufferSource.connect(sound._panner);
    } else {
      sound._node.bufferSource.connect(sound._node);
    }

    // Setup looping and playback rate.
    sound._node.bufferSource.loop = sound._loop;
    if (sound._loop) {
      sound._node.bufferSource.loopStart = sound._start || 0;
      sound._node.bufferSource.loopEnd = sound._stop || 0;
    }
    sound._node.bufferSource.playbackRate.setValueAtTime(
      sound._rate,
      Howler.ctx.currentTime,
    );

    return this;
  }

  /**
   * Prevent memory leaks by cleaning up the buffer source after playback.
   * @param  {Object} node Sound's audio node containing the buffer source.
   * @return {Howl}
   */
  _cleanBuffer(node) {
    var isIOS =
      Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;

    if (Howler._scratchBuffer && node.bufferSource) {
      node.bufferSource.onended = null;
      node.bufferSource.disconnect(0);
      if (isIOS) {
        try {
          node.bufferSource.buffer = Howler._scratchBuffer;
        } catch (e) {}
      }
    }
    node.bufferSource = null;

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
