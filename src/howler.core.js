/*!
 *  howler.js v2.0.0-beta
 *  howlerjs.com
 *
 *  (c) 2013-2014, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  // Setup our audio context.
  var ctx = null;
  var usingWebAudio = true;
  var noAudio = false;
  setupAudioContext();

  // Create a master gain node.
  if (usingWebAudio) {
    var masterGain = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  var HowlerGlobal = function() {
    this.init();
  };
  HowlerGlobal.prototype = {
    /**
     * Initialize the global Howler object.
     * @return {Howler}
     */
    init: function() {
      var self = this;

      // Internal properties.
      self._codecs = {};
      self._howls = [];
      self._muted = false;
      self._volume = 1;

      // Set to false to disable the auto iOS enabler.
      self.iOSAutoEnable = true;

      // No audio is available on this system if this is set to true.
      self.noAudio = noAudio;

      // This will be true if the Web Audio API is available.
      self.usingWebAudio = usingWebAudio;

      // Expose the AudioContext when using Web Audio.
      self.ctx = ctx;

      // Check for supported codecs.
      if (!noAudio) {
        self._setupCodecs();
      }

      return self;
    },

    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;
      vol = parseFloat(vol);

      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        self._volume = vol;

        // When using Web Audio, we just need to adjust the master gain.
        if (usingWebAudio) {
          masterGain.gain.value = vol;
        }

        // Loop through and change volume for all HTML5 audio nodes.
        for (var i=0; i<self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            // Get all of the sounds in this Howl group.
            var ids = self._howls[i]._getSoundIds();

            // Loop through all sounds and change the volumes.
            for (var j=0; j<ids.length; j++) {
              var sound = self._howls[i]._soundById(ids[j]);

              if (sound) {
                sound._node.volume = sound._volume * vol;
              }
            }
          }
        }

        return self;
      }

      return self._volume;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    mute: function(muted) {
      var self = this;

      self._muted = muted;

      // With Web Audio, we just need to mute the master gain.
      if (usingWebAudio) {
        masterGain.gain.value = muted ? 0 : self._volume;
      }

      // Loop through and mute all HTML5 Audio nodes.
      for (var i=0; i<self._howls.length; i++) {
        if (!self._howls[i]._webAudio) {
          // Get all of the sounds in this Howl group.
          var ids = self._howls[i]._getSoundIds();

          // Loop through all sounds and mark the audio node as muted.
          for (var j=0; j<ids.length; j++) {
            var sound = self._howls[i]._soundById(ids[j]);

            if (sound) {
              sound._node.muted = muted;
            }
          }
        }
      }

      return self;
    },

    /**
     * Check for codec support of specific extension.
     * @param  {String} ext Audio file extention.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return this._codecs[ext];
    },

    /**
     * Check for browser support for various codecs and cache the results.
     * @return {Howler}
     */
    _setupCodecs: function() {
      var self = this;
      var audioTest = new Audio();

      self._codecs = {
        mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/, ''),
        opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
        ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
        aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
        m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
        webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
      };

      return self;
    },

    /**
     * iOS will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _enableiOSAudio: function() {
      var self = this;

      // Only run this on iOS if audio isn't already eanbled.
      if (ctx && (self._iOSEnabled || !/iPhone|iPad|iPod/i.test(navigator.userAgent))) {
        return;
      }

      self._iOSEnabled = false;

      // Call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS.
      var unlock = function() {
        // Create an empty buffer.
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Play the empty buffer.
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // Setup a timeout to check that we are unlocked on the next event loop.
        setTimeout(function() {
          if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
            // Update the unlocked state and prevent this check from happening again.
            self._iOSEnabled = true;
            self.iOSAutoEnable = false;

            // Remove the touch start listener.
            window.removeEventListener('touchstart', unlock, false);
          }
        }, 0);
      };

      // Setup a touch start listener to attempt an unlock in.
      window.addEventListener('touchstart', unlock, false);

      return self;
    }
  };

  // Setup the global audio controller.
  var Howler = new HowlerGlobal();

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Create an audio group controller.
   * @param {Object} o Passed in properties for this group.
   */
  var Howl = function(o) {
    var self = this;

    // Throw an error if no source is provided
    if (!o.src) {
      console.error('An array of source files must be passed with any new Howl.');
      return;
    }

    self.init(o);
  };
  Howl.prototype = {
    /**
     * Initialize a new Howl group object.
     * @param  {Object} o Passed in properties for this group.
     * @return {Howl}
     */
    init: function(o) {
      var self = this;

      // Setup user-defined default properties.
      self._autoplay = o.autoplay || false;
      self._ext = o.ext || null;
      self._html5 = o.html5 || false;
      self._muted = o.mute || false;
      self._loop = o.loop || false;
      self._pool = o.pool || 5;
      self._preload = (typeof o.preload === 'boolean') ? o.preload : true;
      self._rate = o.rate || 1;
      self._sprite = o.sprite || {};
      self._src = (typeof o.src !== 'string') ? o.src : [o.src];
      self._volume = o.volume !== undefined ? o.volume : 1;

      // Setup all other default properties.
      self._duration = 0;
      self._loaded = false;
      self._sounds = [];
      self._endTimers = {};

      // Setup event listeners.
      self._onend = o.onend ? [{fn: o.onend}] : [];
      self._onfaded = o.onfaded ? [{fn: o.onfaded}] : [];
      self._onload = o.onload ? [{fn: o.onload}] : [];
      self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
      self._onpause = o.onpause ? [{fn: o.onpause}] : [];
      self._onplay = o.onplay ? [{fn: o.onplay}] : [];

      // Web Audio or HTML5 Audio?
      self._webAudio = usingWebAudio && !self._html5;

      // Automatically try to enable audio on iOS.
      if (typeof ctx !== 'undefined' && ctx && Howler.iOSAutoEnable) {
        Howler._enableiOSAudio();
      }

      // Keep track of this Howl group in the global controller.
      Howler._howls.push(self);

      // Load the source file unless otherwise specified.
      if (self._preload) {
        self.load();
      }

      return self;
    },

    /**
     * Load the audio file.
     * @return {Howler}
     */
    load: function() {
      var self = this;
      var url = null;

      // If no audio is available, quit immediately.
      if (noAudio) {
        self._emit('loaderror');
        return;
      }

      // Loop through the sources and pick the first one that is compatible.
      for (var i=0; i<self._src.length; i++) {
        var ext, str;

        if (self._ext && self._ext[i]) {
          // If an extension was specified, use that instead.
          ext = self._ext[i];
        } else {
          // Extract the file extension from the URL or base64 data URI.
          str = self._src[i];
          ext = /^data:audio\/([^;,]+);/i.exec(str);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          }
        }

        // Check if this extension is available.
        if (Howler.codecs(ext)) {
          url = self._src[i];
          break;
        }
      }

      if (!url) {
        self._emit('loaderror');
        return;
      }

      self._src = url;

      // Create a new sound object and add it to the pool.
      new Sound(self);

      // Load and decode the audio data for playback.
      if (self._webAudio) {
        loadBuffer(self);
      }

      return self;
    },

    /**
     * Play a sound or resume previous playback.
     * @param  {String/Number} sprite Sprite name for sprite playback or sound id to continue previous.
     * @return {Number}        Sound ID.
     */
    play: function(sprite) {
      var self = this;
      var id = null;

      // Determine if a sprite, sound id or nothing was passed
      if (typeof sprite === 'number') {
        id = sprite;
        sprite = null;
      } else if (typeof sprite === 'undefined') {
        // Use the default sound sprite (plays the full audio length).
        sprite = '__default';

        // Check if there is a single paused sound that isn't ended.
        // If there is, play that sound. If not, continue as usual.
        var num = 0;
        for (var i=0; i<self._sounds.length; i++) {
          if (self._sounds[i]._paused && !self._sounds[i]._ended) {
            num++;
            id = self._sounds[i]._id;
          }
        }

        if (num === 1) {
          sprite = null;
        } else {
          id = null;
        }
      }

      // Get the selected node, or get one from the pool.
      var sound = id ? self._soundById(id) : self._inactiveSound();
      if (id && !sprite) {
        sprite = sound._sprite || '__default';
      }

      // If the sound doesn't exist, do nothing.
      if (!sound) {
        return null;
      }

      // If we have no sprite and the sound hasn't loaded, we must wait
      // for the sound to load to get our audio's duration.
      if (!self._loaded && !self._sprite[sprite]) {
        self.once('load', function() {
          self.play(sound._id);
        });
        return sound._id;
      }

      // Don't play the sound if an id was passed and it is already playing.
      if (id && !sound._paused) {
        return sound._id;
      }

      // Determine how long to play for and where to start playing.
      var seek = sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000;
      var duration = ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek;

      // Should this sound loop?
      var loop = !!(sound._loop || self._sprite[sprite][2]);

      // Create a timer to fire at the end of playback or the start of a new loop.
      var ended = function() {
        // Fire the ended event.
        self._emit('end', sound._id);

        // Restart the playback for HTML5 Audio loop.
        if (!self._webAudio && loop) {
          self.stop(sound._id).play(sound._id);
        }

        // Restart this timer if on a Web Audio loop.
        if (self._webAudio && loop) {
          self._emit('play', sound._id);
          sound._seek = sound._start || 0;
          sound._playStart = ctx.currentTime;
          self._endTimers[sound._id] = setTimeout(ended, ((sound._stop - sound._start) * 1000) / Math.abs(self._rate));
        }

        // Mark the node as paused.
        if (self._webAudio && !loop) {
          sound._paused = true;
          sound._ended = true;
          sound._seek = sound._start || 0;
          self._clearTimer(sound._id);

          // Clean up the buffer source.
          sound._node.bufferSource = null;
        }

        // When using a sprite, end the track.
        if (!self._webAudio && !loop) {
          self.stop(sound._id);
        }
      };
      self._endTimers[sound._id] = setTimeout(ended, (duration * 1000) / Math.abs(self._rate));

      // Update the parameters of the sound
      sound._paused = false;
      sound._ended = false;
      sound._sprite = sprite;
      sound._seek = seek;
      sound._start = self._sprite[sprite][0] / 1000;
      sound._stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
      sound._loop = loop;

      // Begin the actual playback.
      var node = sound._node;
      if (self._webAudio) {
        // Fire this when the sound is ready to play to begin Web Audio playback.
        var playWebAudio = function() {
          self._refreshBuffer(sound);

          // Setup the playback params.
          var vol = (sound._muted || self._muted) ? 0 : sound._volume * Howler.volume();
          node.gain.setValueAtTime(vol, ctx.currentTime);
          sound._playStart = ctx.currentTime;

          // Play the sound using the supported method.
          if (typeof node.bufferSource.start === 'undefined') {
            node.bufferSource.noteGrainOn(0, seek, duration);
          } else {
            node.bufferSource.start(0, seek, duration);
          }

          // Start a new timer if none is present.
          if (!self._endTimers[sound._id]) {
            self._endTimers[sound._id] = setTimeout(ended, (duration * 1000) / Math.abs(self._rate));
          }

          self._emit('play', sound._id);
        };

        if (self._loaded) {
          playWebAudio();
        } else {
          // Wait for the audio to load and then begin playback.
          self.once('load', playWebAudio);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      } else {
        // Fire this when the sound is ready to play to begin HTML5 Audio playback.
        var playHtml5 = function() {
          node.currentTime = seek;
          node.muted = sound._muted || self._muted || Howler._muted || node.muted;
          node.volume = sound._volume * Howler.volume();
          node.playbackRate = self._rate;
          setTimeout(function() {
            node.play();
            self._emit('play', sound._id);
          }, 0);
        };

        // Play immediately if ready, or wait for the 'canplaythrough'e vent.
        if (node.readyState === 4 || !node.readyState && navigator.isCocoonJS) {
          playHtml5();
        } else {
          var listener = function() {
            // Setup the new end timer.
            self._endTimers[sound._id] = setTimeout(ended, (duration * 1000) / Math.abs(self._rate));

            // Begin playback.
            playHtml5();

            // Clear this listener.
            node.removeEventListener('canplaythrough', listener, false);
          };
          node.addEventListener('canplaythrough', listener, false);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      }

      return sound._id;
    },

    /**
     * Pause playback and save current position.
     * @param  {Number} id The sound ID (empty to pause all in group).
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // Fire the pause event.
      self._emit('pause', id);

      // Wait for the sound to begin playing before pausing it.
      if (!self._loaded) {
        self.once('play', function() {
          self.pause(id);
        });

        return self;
      }

      // If no id is passed, get all ID's to be paused.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound && !sound._paused) {
          // Reset the seek position.
          sound._seek = self.seek(ids[i]);
          sound._paused = true;

          if (self._webAudio) {
            // make sure the sound has been created
            if (!sound._node.bufferSource) {
              return self;
            }

            if (typeof sound._node.bufferSource.stop === 'undefined') {
              sound._node.bufferSource.noteOff(0);
            } else {
              sound._node.bufferSource.stop(0);
            }

            // Clean up the buffer source.
            sound._node.bufferSource = null;
          } else if (!isNaN(sound._node.duration)) {
            sound._node.pause();
          }
        }
      }

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {Number} id The sound ID (empty to stop all in group).
     * @return {Howl}
     */
    stop: function(id) {
      var self = this;

      // Wait for the sound to begin playing before stopping it.
      if (!self._loaded) {
        self.once('play', function() {
          self.stop(id);
        });

        return self;
      }

      // If no id is passed, get all ID's to be stopped.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound && !sound._paused) {
          // Reset the seek position.
          sound._seek = sound._start || 0;
          sound._paused = true;
          sound._ended = true;

          if (self._webAudio) {
            // make sure the sound has been created
            if (!sound._node.bufferSource) {
              return self;
            }

            if (typeof sound._node.bufferSource.stop === 'undefined') {
              sound._node.bufferSource.noteOff(0);
            } else {
              sound._node.bufferSource.stop(0);
            }

            // Clean up the buffer source.
            sound._node.bufferSource = null;
          } else if (!isNaN(sound._node.duration)) {
            sound._node.pause();
            sound._node.currentTime = sound._start || 0;
          }
        }
      }

      return self;
    },

    /**
     * Mute/unmute a single sound or all sounds in this Howl group.
     * @param  {Boolean} muted Set to true to mute and false to unmute.
     * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
     * @return {Howl}
     */
    mute: function(muted, id) {
      var self = this;

      // Wait for the sound to begin playing before muting it.
      if (!self._loaded) {
        self.once('play', function() {
          self.mute(muted, id);
        });

        return self;
      }

      // If applying mute/unmute to all sounds, update the group's value.
      if (typeof id === 'undefined') {
        if (typeof muted === 'boolean') {
          self._muted = muted;
        } else {
          return self._muted;
        }
      }

      // If no id is passed, get all ID's to be muted.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          sound._muted = muted;

          if (self._webAudio) {
            sound._node.gain.setValueAtTime(muted ? 0 : sound._volume * Howler.volume(), ctx.currentTime);
          } else {
            sound._node.muted = muted;
          }
        }
      }

      return self;
    },

    /**
     * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
     *   volume() -> Returns the group's volume value.
     *   volume(id) -> Returns the sound id's current volume.
     *   volume(vol) -> Sets the volume of all sounds in this Howl group.
     *   volume(vol, id) -> Sets the volume of passed sound id.
     * @return {Howl/Number} Returns self or current volume.
     */
    volume: function() {
      var self = this;
      var args = arguments;
      var vol, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // Return the value of the groups' volume.
        return self._volume;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new volume.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          vol = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        vol = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // Update the volume or return the current volume.
      var sound;
      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        // Wait for the sound to begin playing before changing the volume.
        if (!self._loaded) {
          self.once('play', function() {
            self.volume.apply(self, args);
          });

          return self;
        }

        // Set the group volume.
        if (typeof id === 'undefined') {
          self._volume = vol;
        }

        // Update one or all volumes.
        id = self._getSoundIds(id);
        for (var i=0; i<id.length; i++) {
          // Get the sound.
          sound = self._soundById(id[i]);

          if (sound) {
            sound._volume = vol;

            if (self._webAudio) {
              sound._node.gain.setValueAtTime(vol * Howler.volume(), ctx.currentTime);
            } else {
              sound._node.volume = vol * Howler.volume();
            }
          }
        }
      } else {
        sound = id ? self._soundById(id) : self._sounds[0];
        return sound ? sound._volume : 0;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes (if no id is passsed, all sounds will fade).
     * @param  {Number} from The value to fade from (0.0 to 1.0).
     * @param  {Number} to   The volume to fade to (0.0 to 1.0).
     * @param  {Number} len  Time in milliseconds to fade.
     * @param  {Number} id   The sound id (omit to fade all sounds).
     * @return {Howl}
     */
    fade: function(from, to, len, id) {
      var self = this;

      // Wait for the sound to play before fading.
      if (!self._loaded) {
        self.once('play', function() {
          self.fade(from, to, len, id);
        });

        return self;
      }

      // Set the volume to the start position.
      self.volume(from, id);

      // Fade the volume of one or all sounds.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        // Create a linear fade or fall back to timeouts with HTML5 Audio.
        if (sound) {
          if (self._webAudio) {
            var currentTime = ctx.currentTime;
            var end = currentTime + (len / 1000);
            sound._volume = from;
            sound._node.gain.setValueAtTime(from, currentTime);
            sound._node.gain.linearRampToValueAtTime(to, end);

            // Fire the event when complete.
            setTimeout(function(id, sound) {
              setTimeout(function() {
                sound._volume = to;
                self._emit('faded', id);
              }, end - ctx.currentTime > 0 ? Math.ceil((end - ctx.currentTime) * 1000) : 0);
            }.bind(self, ids[i], sound), len);
          } else {
            var diff = Math.abs(from - to);
            var dir = from > to ? 'out' : 'in';
            var steps = diff / 0.01;
            var stepLen = len / steps;
            
            (function() {
              var vol = from;
              var interval = setInterval(function(id) {
                // Update the volume amount.
                vol += (dir === 'in' ? 0.01 : -0.01);

                // Make sure the volume is in the right bounds.
                vol = Math.max(0, vol);
                vol = Math.min(1, vol);

                // Round to within 2 decimal points.
                vol = Math.round(vol * 100) / 100;

                // Change the volume.
                self.volume(vol, id);

                // When the fade is complete, stop it and fire event.
                if (vol === to) {
                  clearInterval(interval);
                  self._emit('faded', id);
                }
              }.bind(self, ids[i]), stepLen);
            })();
          }
        }
      }

      return self;
    },

    /**
     * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
     *   loop() -> Returns the group's loop value.
     *   loop(id) -> Returns the sound id's loop value.
     *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
     *   loop(loop, id) -> Sets the loop value of passed sound id.
     * @return {Howl/Boolean} Returns self or current loop value.
     */
    loop: function() {
      var self = this;
      var args = arguments;
      var loop, id, sound;

      // Determine the values for loop and id.
      if (args.length === 0) {
        // Return the grou's loop value.
        return self._loop;
      } else if (args.length === 1) {
        if (typeof args[0] === 'boolean') {
          loop = args[0];
        } else {
          // Return this sound's loop value.
          sound = self._soundById(parseInt(args[0], 10));
          return sound ? sound._loop : false;
        }
      } else if (args.length === 2) {
        loop = args[0];
        id = parseInt(args[1], 10);
      }

      // If no id is passed, get all ID's to be looped.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        sound = self._soundById(ids[i]);

        if (sound) {
          sound._loop = loop;
        }
      }

      return self;
    },

    /**
     * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   seek() -> Returns the first sound node's current seek position.
     *   seek(id) -> Returns the sound id's current seek position.
     *   seek(seek) -> Sets the seek position of the first sound node.
     *   seek(seek, id) -> Sets the seek position of passed sound id.
     * @return {Howl/Number} Returns self or the current seek position.
     */
    seek: function() {
      var self = this;
      var args = arguments;
      var seek, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // We will simply return the current position of the first node.
        id = self._sounds[0]._id;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new seek position.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          id = self._sounds[0]._id;
          seek = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        seek = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // If there is no ID, bail out.
      if (typeof id === 'undefined') {
        return self;
      }

      // Wait for the sound to load before seeking it.
      if (!self._loaded) {
        self.once('load', function() {
          self.seek.apply(self, args);
        });

        return self;
      }

      // Get the sound.
      var sound = self._soundById(id);

      if (sound) {
        if (seek >= 0) {
          // Pause the sound and update position for restarting playback.
          self.pause(id);
          sound._seek = seek;
          self._clearTimer(id);
        } else {
          return (self._webAudio) ? sound._seek + (ctx.currentTime - sound._playStart) : sound._node.currentTime;
        }
      }

      return self;
    },

    /**
     * Check if a specific sound is currently playing or not.
     * @param  {Number} id The sound id to check. If none is passed, first sound is used.
     * @return {Boolean}    True if playing and false if not.
     */
    playing: function(id) {
      var self = this;
      var sound = self._soundById(id) || self._sounds[0];

      return sound ? !sound._paused : false;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all sound instances attached to this group.
     */
    unload: function() {
      var self = this;

      // Stop playing any active sounds.
      var sounds = self._sounds;
      for (var i=0; i<sounds.length; i++) {
        // Stop the sound if it is currently playing.
        if (!sounds[i]._paused) {
          self.stop(sounds[i]._id);
          self._emit('end', sounds[i]._id);
        }

        // Remove the source or disconnect.
        if (!self._webAudio) {
          sounds[i]._node.src = '';
        } else {
          sounds[i]._node.disconnect(0);
        }

        // Empty out all of the nodes.
        delete sounds[i]._node;

        // Make sure all timers are cleared out.
        self._clearTimer(sounds[i]._id);

        // Remove the references in the global Howler object.
        var index = Howler._howls.indexOf(self);
        if (index >= 0) {
          Howler._howls.splice(index, 1);
        }
      }

      // Delete this sound from the cache.
      if (cache) {
        delete cache[self._src];
      }
      self = null;

      return null;
    },

    /**
     * Listen to a custom event.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @return {Howl}
     */
    on: function(event, fn, id) {
      var self = this;
      var events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push({id: id, fn: fn});
      }

      return self;
    },

    /**
     * Remove a custom event.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to remove. Leave empty to remove all.
     * @param  {Number}   id    (optional) Only remove events for this sound.
     * @return {Howl}
     */
    off: function(event, fn, id) {
      var self = this;
      var events = self['_on' + event];

      if (fn) {
        // Loop through event store and remove the passed function.
        for (var i=0; i<events.length; i++) {
          if (fn === events[i].fn && id === events[i].id) {
            events.splice(i, 1);
            break;
          }
        }
      } else {
        // Clear out all events of this type.
        events = [];
      }

      return self;
    },

    /**
     * Listen to a custom event and remove it once fired.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @return {Howl}
     */
    once: function(event, fn, id) {
      var self = this;

      // Create the listener method.
      var listener = function() {
        // Call the passed function.
        fn.apply(self, arguments);

        // Clear the listener.
        self.off(event, listener, id);
      };

      // Setup the event listener.
      self.on(event, listener, id);

      return self;
    },

    /**
     * Emit all events of a specific type and pass the sound id.
     * @param  {String} event Event name.
     * @param  {Number} id    Sound ID.
     * @param  {Number} msg   Message to go with event.
     * @return {Howl}
     */
    _emit: function(event, id, msg) {
      var self = this;
      var events = self['_on' + event];
      
      // Loop through event store and fire all functions.
      for (var i=0; i<events.length; i++) {
        if (!events[i].id || events[i].id === id) {
          setTimeout(function(fn) {
            fn.call(this, id, msg);
          }.bind(self, events[i].fn), 0);
        }
      }

      return self;
    },

    /**
     * Clear the end timer for a sound playback.
     * @param  {Number} id The sound ID.
     * @return {Howl}
     */
    _clearTimer: function(id) {
      var self = this;

      if (self._endTimers[id]) {
        clearTimeout(self._endTimers[id]);
        delete self._endTimers[id];
      }

      return self;
    },

    /**
     * Return the sound identified by this ID, or return null.
     * @param  {Number} id Sound ID
     * @return {Object}    Sound object or null.
     */
    _soundById: function(id) {
      var self = this;

      // Loop through all sounds and find the one with this ID.
      for (var i=0; i<self._sounds.length; i++) {
        if (id === self._sounds[i]._id) {
          return self._sounds[i];
        }
      }

      return null;
    },

    /**
     * Return an inactive sound from the pool or create a new one.
     * @return {Sound} Sound playback object.
     */
    _inactiveSound: function() {
      var self = this;

      self._drain();

      // Find the first inactive node to recycle.
      for (var i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          return self._sounds[i].reset();
        }
      }

      // If no inactive node was found, create a new one.
      return new Sound(self);
    },

    /**
     * Drain excess inactive sounds from the pool.
     */
    _drain: function() {
      var self = this;
      var limit = self._pool;
      var cnt = 0;
      var i = 0;

      // If there are less sounds than the max pool size, we are done.
      if (self._sounds.length < limit) {
        return;
      }

      // Count the number of inactive sounds.
      for (i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          cnt++;
        }
      }

      // Remove excess inactive sounds, going in reverse order.
      for (i=self._sounds.length - 1; i>=0; i--) {
        if (cnt <= limit) {
          return;
        }

        if (self._sounds[i]._ended) {
          // Disconnect the audio source when using Web Audio.
          if (self._webAudio && self._sounds[i]._node) {
            self._sounds[i]._node.disconnect(0);
          }

          // Remove sounds until we have the pool size.
          self._sounds.splice(i, 1);
          cnt--;
        }
      }
    },

    /**
     * Get all ID's from the sounds pool.
     * @param  {Number} id Only return one ID if one is passed.
     * @return {Array}    Array of IDs.
     */
    _getSoundIds: function(id) {
      var self = this;

      if (typeof id === 'undefined') {
        var ids = [];
        for (var i=0; i<self._sounds.length; i++) {
          ids.push(self._sounds[i]._id);
        }

        return ids;
      } else {
        return [id];
      }
    },

    /**
     * Load the sound back into the buffer source.
     * @param  {Sound} sound The sound object to work with.
     * @return {Howl}
     */
    _refreshBuffer: function(sound) {
      var self = this;

      // Setup the buffer source for playback.
      sound._node.bufferSource = ctx.createBufferSource();
      sound._node.bufferSource.buffer = cache[self._src];

      // Connect to the correct node.
      if (sound._panner) {
        sound._node.bufferSource.connect(sound._panner);
      } else {
        sound._node.bufferSource.connect(sound._node);
      }

      // Setup looping and playback rate.
      sound._node.bufferSource.loop = sound._loop;
      if (sound._loop) {
        sound._node.bufferSource.loopStart = sound._seek;
        sound._node.bufferSource.loopEnd = sound._stop;
      }
      sound._node.bufferSource.playbackRate.value = self._rate;

      return self;
    }
  };

  /** Single Sound Methods **/
  /***************************************************************************/

  /**
   * Setup the sound object, which each node attached to a Howl group is contained in.
   * @param {Object} howl The Howl parent group.
   */
  var Sound = function(howl) {
    this._parent = howl;
    this.init();
  };
  Sound.prototype = {
    /**
     * Initialize a new Sound object.
     * @return {Sound}
     */
    init: function() {
      var self = this;
      var parent = self._parent;

      // Setup the default parameters.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._muted = parent._muted;
      self._seek = 0;
      self._paused = true;
      self._ended = true;

      // Generate a unique ID for this sound.
      self._id = Math.round(Date.now() * Math.random());

      // Add itself to the parent's pool.
      parent._sounds.push(self);

      // Create the new node.
      self.create();

      return self;
    },

    /**
     * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
     * @return {Sound}
     */
    create: function() {
      var self = this;
      var parent = self._parent;
      var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume * Howler.volume();

      if (parent._webAudio) {
        // Create the gain node for controlling volume (the source will connect to this).
        self._node = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
        self._node.gain.setValueAtTime(volume, ctx.currentTime);
        self._node.paused = true;
        self._node.connect(masterGain);
      } else {
        self._node = new Audio();

        // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
        var errorListener = function () {
          if (self._node.error && self._node.error.code === 4) {
            Howler.noAudio = true;
          }

          // Fire an error event and pass back the code.
          parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);
          
          // Clear the event listener.
          self._node.removeEventListener('error', errorListener, false);
        };
        self._node.addEventListener('error', errorListener, false);

        // Listen for 'canplaythrough' event to let us know the sound is ready.
        var loadListener = function() {
          // Round up the duration to account for the lower precision in HTML5 Audio.
          parent._duration = Math.ceil(self._node.duration * 10) / 10;

          // Setup a sprite if none is defined.
          if (Object.keys(parent._sprite).length === 0) {
            parent._sprite = {__default: [0, parent._duration * 1000]};
          }

          if (!parent._loaded) {
            parent._loaded = true;
            parent._emit('load');
          }

          if (parent._autoplay) {
            parent.play();
          }

          // Clear the event listener.
          self._node.removeEventListener('canplaythrough', loadListener, false);
        };
        self._node.addEventListener('canplaythrough', loadListener, false);

        // Setup the new audio node.
        self._node.src = parent._src;
        self._node.preload = 'auto';
        self._node.volume = volume;

        // Begin loading the source.
        self._node.load();
      }

      return self;
    },

    /**
     * Reset the parameters of this sound to the original state (for recycle).
     * @return {Sound}
     */
    reset: function() {
      var self = this;
      var parent = self._parent;

      // Reset all of the parameters of this sound.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._muted = parent._muted;
      self._seek = 0;
      self._paused = true;
      self._ended = true;
      self._sprite = null;

      // Generate a new ID so that it isn't confused with the previous sound.
      self._id = Math.round(Date.now() * Math.random());

      return self;
    }
  };

  /** Helper Methods **/
  /***************************************************************************/

  // Only define these methods when using Web Audio.
  if (usingWebAudio) {

    var cache = {};

    /**
     * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
     * @param  {Howl} self
     */
    var loadBuffer = function(self) {
      var url = self._src;

      // Check if the buffer has already been cached and use it instead.
      if (cache[url]) {
        // Set the duration from the cache.
        self._duration = cache[url].duration;

        // Load the sound into this Howl.
        loadSound(self);

        return;
      }

      if (/^data:[^;]+;base64,/.test(url)) {
        // Decode the base64 data URI without XHR, since some browsers don't support it.
        var data = atob(url.split(',')[1]);
        var dataView = new Uint8Array(data.length);
        for (var i=0; i<data.length; ++i) {
          dataView[i] = data.charCodeAt(i);
        }
        
        decodeAudioData(dataView.buffer, self);
      } else {
        // Load the buffer from the URL.
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          decodeAudioData(xhr.response, self);
        };
        xhr.onerror = function() {
          // If there is an error, switch to HTML5 Audio.
          if (self._webAudio) {
            self._buffer = true;
            self._webAudio = false;
            self._sounds = [];
            delete cache[url];
            self.load();
          }
        };
        safeXhrSend(xhr);
      }
    };

    /**
     * Send the XHR request wrapped in a try/catch.
     * @param  {Object} xhr XHR to send.
     */
    var safeXhrSend = function(xhr) {
      try {
        xhr.send();
      } catch (e) {
        xhr.onerror();
      }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Howl}        self
     */
    var decodeAudioData = function(arraybuffer, self) {
      // Decode the buffer into an audio source.
      ctx.decodeAudioData(arraybuffer, function(buffer) {
        if (buffer) {
          cache[self._src] = buffer;
          loadSound(self, buffer);
        }
      }, function() {
        self._emit('loaderror');
      });
    };

    /**
     * Sound is now loaded, so finish setting everything up and fire the loaded event.
     * @param  {Howl} self
     * @param  {Object} buffer The decoded buffer sound source.
     */
    var loadSound = function(self, buffer) {
      // Set the duration.
      if (buffer && !self._duration) {
        self._duration = buffer.duration;
      }

      // Setup a sprite if none is defined.
      if (Object.keys(self._sprite).length === 0) {
        self._sprite = {__default: [0, self._duration * 1000]};
      }

      // Fire the loaded event.
      if (!self._loaded) {
        self._loaded = true;
        self._emit('load');
      }

      // Begin playback if specified.
      if (self._autoplay) {
        self.play();
      }
    };

  }

  /**
   * Setup the audio context when available, or switch to HTML5 Audio mode.
   */
  function setupAudioContext() {
    try {
      if (typeof AudioContext !== 'undefined') {
        ctx = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        ctx = new webkitAudioContext();
      } else {
        usingWebAudio = false;
      }
    } catch(e) {
      usingWebAudio = false;
    }

    if (!usingWebAudio) {
      if (typeof Audio !== 'undefined') {
        try {
          new Audio();
        } catch(e) {
          noAudio = true;
        }
      } else {
        noAudio = true;
      }
    }
  }

  // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
  if (typeof define === 'function' && define.amd) {
    define('howler', function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // Define globally in case AMD is not available or unused.
  if (typeof window !== 'undefined') {
    window.HowlerGlobal = HowlerGlobal;
    window.Howler = Howler;
    window.Howl = Howl;
    window.Sound = Sound;
  }
})();