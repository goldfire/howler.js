/*!
 *  howler.js v1.0.0
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
    var gainNode = ctx.createGainNode();
    gainNode.gain.value = 1;
    gainNode.connect(ctx.destination);
  }

  // create global controller
  var HowlerGlobal = function() {
    this._volume = 1;
  };
  HowlerGlobal.prototype = {
    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Object/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          gainNode.gain.value = vol;
        } else {
          // loop through cache and change volume of all nodes
          for (var key in cache) {
            if (cache.hasOwnProperty(key)) {
              // loop through the audio nodes
              for (var i=0; i<cache[key]._audioNode.length; i++) {
                cache[key]._audioNode[i].volume = cache[key]._volume * self._volume;
              }
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
      if (usingWebAudio) {
        gainNode.gain.value = 0;
      } else {
        for (var key in cache) {
          if (cache.hasOwnProperty(key)) {
            // loop through the audio nodes
            for (var i=0; i<cache[key]._audioNode.length; i++) {
              cache[key]._audioNode[i].volume = 0;
            }
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
      
      if (usingWebAudio) {
        gainNode.gain.value = self._volume;
      } else {
        for (var key in cache) {
          if (cache.hasOwnProperty(key)) {
            // loop through the audio nodes
            for (var i=0; i<cache[key]._audioNode.length; i++) {
              cache[key]._audioNode[i].volume = cache[key]._volume * self._volume;
            }
          }
        }
      }

      return self;
    }
  };

  // allow access to the global audio controls
  window.Howler = new HowlerGlobal();

  // chek for browser codec support
  var audioTest = new Audio();
  var codecs = {
    mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/,''),
    ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,''),
    wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/,''),
    m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/,'')
  };
  audioTest = null;

  // setup the audio object
  var Howl = window.Howl = function(o) {
    // setup the defaults
    this._autoplay = o.autoplay || false;
    this._duration = o.duration || 0;
    this._loop = o.loop || false;
    this._preload = o.preload || 'auto';
    this._sprite = o.sprite || {};
    this._src = o.src || '';
    this._pos = o.pos || 0;
    this._volume = o.volume || 1;
    this._urls = o.urls || [];

    // setup event functions
    this._onload = o.onload || function() {};
    this._onend = o.onend || function() {};
    this._onpause = o.onpause || function() {};

    this._onendTimer = [];

    // check if we need to fall back to HTML5 Audio
    if (!usingWebAudio) {
      this._audioNode = [];
    } else {
      // create gain node
      this._gainNode = ctx.createGainNode();
      this._gainNode.gain.value = this._volume;
      this._gainNode.connect(gainNode);
    }

    // load the track
    this.load();
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
        var ext = self._urls[i].toLowerCase().match(/.+\.([^?]+)(\?|$)/)[1],
          canPlay = false;

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
      
      if (usingWebAudio) {
        loadBuffer(self, url);
      } else {
        var newNode = new Audio();
        self._audioNode.push(newNode);

        // setup the new audio node
        newNode.src = url;
        newNode.preload = self._preload;
        newNode.volume = self._volume;
        newNode.load();
        newNode.addEventListener('loadedmetadata', function() {
          self._duration = newNode.duration;
          self.on('load');

          if (self._autoplay) {
            self.play();
          }

          // add this sound to the cache
          cache[url] = self;
        }, false);
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

      // if the sprite doesn't exist, play nothing
      if (sprite && !self._sprite[sprite]) {
        return self;
      }

      // determine where to start playing from
      var pos = (sprite) ? self._sprite[sprite][0] / 1000 : self._pos,
        duration = (sprite) ? self._sprite[sprite][1] / 1000 : self._duration - pos;

      // set timer to fire the 'onend' event
      var soundId = Date.now() + '';
      (function() {
        var data = {
          id: soundId,
          sprite: sprite
        };
        self._onendTimer.push(setTimeout(function() {
          // if looping, restart the track
          if (self._loop) {
            self.stop().play(sprite);
          }

          // end the track if it is HTML audio
          if (!usingWebAudio) {
            self.pause(data.id);
          }

          // fire ended event
          self.on('end');
        }, duration * 1000));
      })();

      if (usingWebAudio) {
        // load the sound into context
        refreshBuffer(self);

        self._playStart = ctx.currentTime;
        self.bufferSource.noteGrainOn(0, pos, duration);
      } else {
        self.inactiveNode(function(node) {
          node.id = soundId;
          node.currentTime = pos;
          node.play();
        });
      }

      return self;
    },

    /**
     * Pause playback and save the current position.
     * @param {String} id (optional) Used only for HTML5 Audio to pause specific node.
     * @return {Object}
     */
    pause: function(id) {
      var self = this;

      // clear 'onend' timer
      if (self._onendTimer[0]) {
        clearTimeout(self._onendTimer[0]);
        self._onendTimer.splice(0, 1);
      }

      if (usingWebAudio) {
        // make sure the sound has been created
        if (!self.bufferSource) {
          return self;
        }

        self._pos += ctx.currentTime - self._playStart;
        self.bufferSource.noteOff(0);
      } else {
        var activeNode = (id) ? self.nodeById(id) : self.activeNode();

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

      // clear 'onend' timer
      if (self._onendTimer[0]) {
        clearTimeout(self._onendTimer[0]);
        self._onendTimer.splice(0, 1);
      }

      if (usingWebAudio) {
        // make sure the sound has been created
        if (!self.bufferSource) {
          return self;
        }

        self.bufferSource.noteOff(0);
      } else {
        var activeNode = self.activeNode();

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

      if (usingWebAudio) {
        self._gainNode.gain.value = 0;
      } else {
        var activeNode = self.activeNode();

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

      if (usingWebAudio) {
        self._gainNode.gain.value = self._volume;
      } else {
        var activeNode = self.activeNode();

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

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          self._gainNode.gain.value = vol;
        } else {
          var activeNode = self.activeNode();

          if (activeNode) {
            activeNode.volume = vol * Howl.volume();
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

      if (usingWebAudio) {
        if (pos >= 0) {
          self._pos = pos;
          self.pause().play();

          return self;
        } else {
          return self._pos + (ctx.currentTime - self._playStart);
        }
      } else {
        var activeNode = self.activeNode();

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

      self.volume(0).play();

      for (var i=1; i<=iterations; i++) {
        (function() {
          var vol = self._volume + 0.01 * i,
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

      for (var i=1; i<=iterations; i++) {
        (function() {
          var vol = self._volume - 0.01 * i,
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
    nodeById: function(id) {
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
    activeNode: function() {
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
      self.drainPool();

      return node;
    },

    /**
     * Get the first inactive audio node (HTML5 audio use only).
     * If there is none, create a new one and add it to the pool.
     * @param  {Function} callback Function to call when the audio node is ready.
     */
    inactiveNode: function(callback) {
      var self = this,
        node = null;

      // find first inactive node to recycle
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused) {
          callback(self._audioNode[i]);
          node = true;
          break;
        }
      }

      // remove excess inactive nodes
      self.drainPool();

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
    drainPool: function() {
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
     * Call/set custom events.
     * @param  {Function} fn Function to call.
     * @return {Object}
     */
    on: function(event, fn) {
      var self = this;

      if (fn) {
        self['_on' + event] = fn;
      } else {
        self['_on' + event].call();
      }
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