/*!
 *  howler.js v1.0.10
 *  howlerjs.com
 *
 *  (c) 2013, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {
  // setup
  var cache = {};

  // setup the audio context
  var ctx = null,
    usingWebAudio = true;
  if (typeof AudioContext !== 'undefined') {
    ctx = new AudioContext();
  } else if (typeof webkitAudioContext !== 'undefined') {
    ctx = new webkitAudioContext();
  } else {
    usingWebAudio = false;
  }

  // create a master gain node
  if (usingWebAudio) {
    var gainNode = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(ctx.destination);
  }

  // create global controller
  var HowlerGlobal = function() {
    this._volume = 1;
    this._muted = false;
    this.usingWebAudio = usingWebAudio;
  };
  HowlerGlobal.prototype = {
    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Object/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      if (vol && vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          gainNode.gain.value = vol;
        }

        // loop through cache and change volume of all nodes that are using HTML5 Audio
        for (var key in cache) {
          if (cache.hasOwnProperty(key) && cache[key]._webAudio === false) {
            // loop through the audio nodes
            for (var i=0; i<cache[key]._audioNode.length; i++) {
              cache[key]._audioNode[i].volume = cache[key]._volume * self._volume;
            }
          }
        }

        return self;
      } else {
        // return the current global volume
        if (usingWebAudio) {
          return gainNode.gain.value;
        } else {
          return self._volume;
        }
      }
    },

    /**
     * Mute all sounds.
     * @return {Object}
     */
    mute: function() {
      var self = this;

      self._muted = true;

      if (usingWebAudio) {
        gainNode.gain.value = 0;
      }

      for (var key in cache) {
        if (cache.hasOwnProperty(key) && cache[key]._webAudio === false) {
          // loop through the audio nodes
          for (var i=0; i<cache[key]._audioNode.length; i++) {
            cache[key]._audioNode[i].volume = 0;
          }
        }
      }

      return self;
    },

    /**
     * Unmute all sounds.
     * @return {Object}
     */
    unmute: function() {
      var self = this;

      self._muted = false;
      
      if (usingWebAudio) {
        gainNode.gain.value = self._volume;
      }

      for (var key in cache) {
        if (cache.hasOwnProperty(key) && cache[key]._webAudio === false) {
          // loop through the audio nodes
          for (var i=0; i<cache[key]._audioNode.length; i++) {
            cache[key]._audioNode[i].volume = cache[key]._volume * self._volume;
          }
        }
      }

      return self;
    }
  };

  // allow access to the global audio controls
  window.Howler = new HowlerGlobal();

  // check for browser codec support
  var audioTest = new Audio();
  var codecs = {
    mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/,''),
    ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,''),
    wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/,''),
    m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/,''),
    webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,'')
  };
  audioTest = null;

  // setup the audio object
  var Howl = window.Howl = function(o) {
    var self = this;

    // setup the defaults
    self._autoplay = o.autoplay || false;
    self._buffer = o.buffer || false;
    self._duration = o.duration || 0;
    self._loop = o.loop || false;
    self._loaded = false;
    self._sprite = o.sprite || {};
    self._src = o.src || '';
    self._pos = o.pos || 0;
    self._volume = o.volume || 1;
    self._urls = o.urls || [];

    // setup event functions
    self._onload = [o.onload || function() {}];
    self._onend = [o.onend || function() {}];
    self._onpause = [o.onpause || function() {}];
    self._onplay = [o.onplay || function() {}];

    self._onendTimer = [];

    // Web Audio or HTML5 Audio?
    self._webAudio = usingWebAudio && !self._buffer;

    // check if we need to fall back to HTML5 Audio
    if (!self._webAudio) {
      self._audioNode = [];
    } else {
      // create gain node
      self._gainNode = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
      self._gainNode.gain.value = self._volume;
      self._gainNode.connect(gainNode);
    }

    // load the track
    self.load();
  };

  // setup all of the methods
  Howl.prototype = {
    /**
     * Load an audio file.
     * @return {Object}
     */
    load: function() {
      var self = this,
        url = null;

      // loop through source URLs and pick the first one that is compatible
      for (var i=0; i<self._urls.length; i++) {
        var ext = self._urls[i].toLowerCase().match(/.+\.([^?]+)(\?|$)/),
          canPlay = false;

        // figure out the filetype (whether an extension or base64 data)
        ext = (ext && ext.length >= 2) ? ext[1] : self._urls[i].toLowerCase().match(/data\:audio\/([^?]+);/)[1];

        switch (ext) {
          case 'mp3':
            canPlay = codecs.mp3;
            break;

          case 'ogg':
            canPlay = codecs.ogg;
            break;

          case 'wav':
            canPlay = codecs.wav;
            break;

          case 'm4a':
            canPlay = codecs.m4a;
            break;

          case 'weba':
            canPlay = codecs.webm;
            break;
        }

        if (canPlay === true) {
          url = self._urls[i];
          break;
        }
      }

      if (!url) {
        return;
      }
      
      self._src = url;
      
      if (self._webAudio) {
        loadBuffer(self, url);
      } else {
        var newNode = new Audio();
        self._audioNode.push(newNode);

        // setup the new audio node
        newNode.src = url;
        newNode.preload = 'auto';
        newNode.volume = (Howler._muted) ? 0 : self._volume * Howler.volume();

        // add this sound to the cache
        cache[url] = self;

        // setup the event listener to start playing the sound
        // as soon as it has buffered enough
        var listener = function() {
          self._duration = newNode.duration;
          self._loaded = true;
          self.on('load');

          if (self._autoplay) {
            self.play();
          }

          // clear the event listener
          newNode.removeEventListener('canplaythrough', listener, false);
        };
        newNode.addEventListener('canplaythrough', listener, false);
        newNode.load();
      }

      return self;
    },

    /**
     * Get/set the URLs to be pulled from to play in this source.
     * @param  {Array} urls Arry of URLs to load from
     * @return {Object}      Returns self or the current URLs
     */
    urls: function(urls) {
      var self = this;

      if (urls) {
        self._urls = urls;
        self.stop();
        self.load();

        return self;
      } else {
        return self._urls;
      }
    },

    /**
     * Play a sound from the current time (0 by default).
     * @param  {String} sprite (optional) Plays from the specified position in the sound sprite definition.
     * @return {Object}
     */
    play: function(sprite) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.play(sprite);
        });

        return self;
      }

      // if the sprite doesn't exist, play nothing
      if (sprite && !self._sprite[sprite]) {
        return self;
      }

      // determine where to start playing from
      var pos = (sprite) ? self._sprite[sprite][0] / 1000 : self._pos,
        duration = (sprite) ? self._sprite[sprite][1] / 1000 : self._duration - pos;

      // set timer to fire the 'onend' event
      var soundId = Math.round(Date.now() * Math.random()) + '',
        timerId;
      (function() {
        var data = {
          id: soundId,
          sprite: sprite
        };
        timerId = setTimeout(function() {
          // if looping, restart the track
          if (self._loop) {
            self.stop().play(sprite);
          }

          // end the track if it is HTML audio
          if (!self._webAudio) {
            self.pause(data.id, data.timer);
          }

          // fire ended event
          self.on('end');
        }, duration * 1000);

        // store the reference to the timer
        self._onendTimer.push(timerId);

        // remember which timer to cancel
        data.timer = self._onendTimer[self._onendTimer.length - 1];
      })();

      if (self._webAudio) {
        // load the sound into context
        refreshBuffer(self);

        self._playStart = ctx.currentTime;
        if (typeof self.bufferSource.start === 'undefined') {
          self.bufferSource.noteGrainOn(0, pos, duration);
        } else {
          self.bufferSource.start(0, pos, duration);
        }
      } else {
        self._inactiveNode(function(node) {
          if (node.readyState === 4) {
            node.id = soundId;
            node.currentTime = pos;
            node.play();
          } else {
            self._clearEndTimer(timerId);

            (function(){
              var sound = self,
                playSprite = sprite,
                newNode = node;
              var listener = function() {
                sound.play(playSprite);

                // clear the event listener
                newNode.removeEventListener('canplaythrough', listener, false);
              };
              newNode.addEventListener('canplaythrough', listener, false);
            })();

            return self;
          }
        });
      }

      self.on('play');

      return self;
    },

    /**
     * Pause playback and save the current position.
     * @param {String} id (optional) Used only for HTML5 Audio to pause specific node.
     * @param {String} id (optional) Used only for HTML5 Audio to clear the correct timeout id.
     * @return {Object}
     */
    pause: function(id, timerId) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.pause(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(timerId);

      if (self._webAudio) {
        // make sure the sound has been created
        if (!self.bufferSource) {
          return self;
        }

        self._pos += ctx.currentTime - self._playStart;
        self.bufferSource.noteOff(0);
      } else {
        var activeNode = (id) ? self._nodeById(id) : self._activeNode();

        if (activeNode) {
          self._pos = activeNode.currentTime;
          activeNode.pause();
        }
      }

      self.on('pause');

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @return {Object}
     */
    stop: function() {
      var self = this;

      self._pos = 0;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.stop();
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(0);

      if (self._webAudio) {
        // make sure the sound has been created
        if (!self.bufferSource) {
          return self;
        }

        if (typeof self.bufferSource.stop === 'undefined') {
          self.bufferSource.noteOff(0);
        } else {
          self.bufferSource.stop(0);
        }
        
      } else {
        var activeNode = self._activeNode();

        if (activeNode) {
          activeNode.pause();
          activeNode.currentTime = 0;
        }
      }

      return self;
    },

    /**
     * Mute this sound.
     * @return {Object}
     */
    mute: function() {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.mute();
        });

        return self;
      }

      if (self._webAudio) {
        self._gainNode.gain.value = 0;
      } else {
        var activeNode = self._activeNode();

        if (activeNode) {
          activeNode.volume = 0;
        }
      }

      return self;
    },

    /**
     * Unmute this sound.
     * @return {Object}
     */
    unmute: function() {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.unmute();
        });

        return self;
      }

      if (self._webAudio) {
        self._gainNode.gain.value = self._volume;
      } else {
        var activeNode = self._activeNode();

        if (activeNode) {
          activeNode.volume = self._volume;
        }
      }

      return self;
    },

    /**
     * Get/set volume of this sound.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Object/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.volume(vol);
        });

        return self;
      }

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (self._webAudio) {
          self._gainNode.gain.value = vol;
        } else {
          var activeNode = self._activeNode();

          if (activeNode) {
            activeNode.volume = vol * Howler.volume();
          }
        }

        return self;
      } else {
        return self._volume;
      }
    },

    /**
     * Get/set whether to loop the sound.
     * @param  {Boolean} loop To loop or not to loop, that is the question.
     * @return {Object/Boolean}      Returns self or current looping value.
     */
    loop: function(loop) {
      var self = this;

      if (typeof loop === 'boolean') {
        self._loop = loop;

        return self;
      } else {
        return self._loop;
      }
    },

    /**
     * Get/set sound sprite definition.
     * @param  {Object} sprite Example: {spriteName: [offset, duration]}
     *                @param {Integer} offset Where to begin playback in milliseconds
     *                @param {Integer} duration How long to play in milliseconds
     * @return {Object}        Returns current sprite sheet or self.
     */
    sprite: function(sprite) {
      var self = this;

      if (typeof sprite === 'object') {
        self._sprite = sprite;

        return self;
      } else {
        return self._sprite;
      }
    },

    /**
     * Get/set the position of playback.
     * @param  {Float} pos The position to move current playback to.
     * @return {Object/Float}      Returns self or current playback position.
     */
    pos: function(pos) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.pos(pos);
        });

        return self;
      }

      if (self._webAudio) {
        if (pos >= 0) {
          self._pos = pos;
          self.pause().play();

          return self;
        } else {
          return self._pos + (ctx.currentTime - self._playStart);
        }
      } else {
        var activeNode = self._activeNode();

        if (!activeNode) {
          return self;
        }

        if (pos >= 0) {
          activeNode.currentTime = pos;

          return self;
        } else {
          return activeNode.currentTime;
        }
      }
    },

    /**
     * Fade in the current sound.
     * @param  {Float} to  Volume to fade to (0.0 to 1.0).
     * @param  {Number} len Time in milliseconds to fade.
     * @param  {Function} callback
     * @return {Object}
     */
    fadeIn: function(to, len, callback) {
      var self = this,
        dist = to,
        iterations = dist / 0.01,
        hold = len / iterations;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.fadeIn(to, len, callback);
        });

        return self;
      }

      self.volume(0).play();

      for (var i=1; i<=iterations; i++) {
        (function() {
          var vol = Math.round(1000 * (self._volume + 0.01 * i)) / 1000,
            toVol = to;
          setTimeout(function() {
            self.volume(vol);

            if (vol === toVol) {
              if (callback) callback();
            }
          }, hold * i);
        })();
      }

      return self;
    },

    /**
     * Fade out the current sound and pause when finished.
     * @param  {Float} to  Volume to fade to (0.0 to 1.0).
     * @param  {Number} len Time in milliseconds to fade.
     * @param  {Function} callback
     * @return {Object}
     */
    fadeOut: function(to, len, callback) {
      var self = this,
        dist = self._volume - to,
        iterations = dist / 0.01,
        hold = len / iterations;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.fadeOut(to, len, callback);
        });

        return self;
      }

      for (var i=1; i<=iterations; i++) {
        (function() {
          var vol = Math.round(1000 * (self._volume - 0.01 * i)) / 1000,
            toVol = to;
          setTimeout(function() {
            self.volume(vol);

            if (vol === toVol) {
              if (callback) callback();
              self.pause();
            }
          }, hold * i);
        })();
      }

      return self;
    },

    /**
     * Get an HTML5 Audio node by ID.
     * @return {Object} Audio node.
     */
    _nodeById: function(id) {
      var self = this,
        node = null;

      // find the node with this ID
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].id === id) {
          node = self._audioNode[i];
          break;
        }
      }

      return node;
    },

    /**
     * Get the first active audio node (HTML5 audio use only).
     * @return {Object} Audio node.
     */
    _activeNode: function() {
      var self = this,
        node = null;

      // find the first playing node
      for (var i=0; i<self._audioNode.length; i++) {
        if (!self._audioNode[i].paused) {
          node = self._audioNode[i];
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      return node;
    },

    /**
     * Get the first inactive audio node (HTML5 audio use only).
     * If there is none, create a new one and add it to the pool.
     * @param  {Function} callback Function to call when the audio node is ready.
     */
    _inactiveNode: function(callback) {
      var self = this,
        node = null;

      // find first inactive node to recycle
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
          callback(self._audioNode[i]);
          node = true;
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      if (node) {
        return;
      }

      // create new node if there are no inactives
      self.load();
      var newNode = self._audioNode[self._audioNode.length - 1];
      newNode.addEventListener('loadedmetadata', function() {
        callback(newNode);
      });
    },

    /**
     * If there are more than 5 inactive audio nodes in the pool, clear out the rest.
     */
    _drainPool: function() {
      var self = this,
        inactive = 0,
        i;

      // count the number of inactive nodes
      for (i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused) {
          inactive++;
        }
      }

      // remove excess inactive nodes
      for (i=0; i<self._audioNode.length; i++) {
        if (inactive <= 5) {
          break;
        }

        if (self._audioNode[i].paused) {
          inactive--;
          self._audioNode.splice(i, 1);
        }
      }
    },

    /**
     * Clear 'onend' timeout before it ends.
     * @param  {Number} timerId The ID of the sound to be cancelled.
     */
    _clearEndTimer: function(timerId) {
      var self = this,
        timer = self._onendTimer.indexOf(timerId);

      // make sure the timer gets cleared
      timer = timer >= 0 ? timer : 0;

      if (self._onendTimer[timer]) {
        clearTimeout(self._onendTimer[timer]);
        self._onendTimer.splice(timer, 1);
      }
    },

    /**
     * Call/set custom events.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Function to call.
     * @return {Object}
     */
    on: function(event, fn) {
      var self = this,
        events = self['_on' + event];

      if (fn) {
        events.push(fn);
      } else {
        for (var i=0; i<events.length; i++) {
          events[i].call();
        }
      }

      return self;
    },

    /**
     * Remove a custom event.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Listener to remove.
     * @return {Object}         [description]
     */
    off: function(event, fn) {
      var self = this,
        events = self['_on' + event],
        fnString = fn.toString();

      // loop through functions in the event for comparison
      for (var i=0; i<events.length; i++) {
        if (fnString === events[i].toString()) {
          events.splice(i, 1);
          break;
        }
      }

      return self;
    }

  };

  // only define these functions when using WebAudio
  if (usingWebAudio) {

    /**
     * Buffer a sound from URL (or from cache) and decode to audio source (Web Audio API).
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var loadBuffer = function(obj, url) {
      // check if the buffer has already been cached
      if (url in cache) {
        // set the duration from the cache
        obj._duration = cache[url].duration;

        // load the sound into this object
        loadSound(obj);
      } else {
        // load the buffer from the URL
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          // decode the buffer into an audio source
          ctx.decodeAudioData(xhr.response, function(buffer) {
            if (buffer) {
              cache[url] = buffer;
              loadSound(obj, buffer);
            }
          });
        };
        xhr.send();
      }
    };

    /**
     * Finishes loading the Web Audio API sound and fies the loaded event
     * @param  {Object} obj    The Howl object for the sound to load.
     * @param  {Objecct} buffer The decoded buffer sound source.
     */
    var loadSound = function(obj, buffer) {
      // set the duration
      obj._duration = (buffer) ? buffer.duration : obj._duration;

      // fire the loaded event
      obj._loaded = true;
      obj.on('load');

      if (obj._autoplay) {
        obj.play();
      }
    };

    /**
     * Load the sound back into the buffer source.
     * @param  {Object} obj The sound to load.
     */
    var refreshBuffer = function(obj) {
      obj.bufferSource = ctx.createBufferSource();
      obj.bufferSource.buffer = cache[obj._src];
      obj.bufferSource.connect(obj._gainNode);
      obj.bufferSource.loop = obj._loop;
    };

  }

})();