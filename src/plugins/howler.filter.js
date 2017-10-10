/*!
 *  Filters Plugin - Adds support for filters (lowpass, high pass, band pass, or notch) on individual sounds when using WebAudio.
 *                 - Jack Campbell jackcampbell@acm.org
 *  
 *  howler.js v2.0.4
 *  howlerjs.com
 *
 *  (c) 2013-2017, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
(function() {
    
      'use strict';
    
      /** Group Methods **/
      /***************************************************************************/
    
      /**
       * Add new properties to the core init.
       * @param  {Function} _super Core init method.
       * @return {Howl}
       */
      Howl.prototype.init = (function(_super) {
        return function(o) {
          var self = this;

          self._q = o.qFactor || 1.0;
          self._filterType = o.filterType || 'lowpass';
          self._frequency = o.frequency || 1000.0;
    
          // Complete initilization with howler.js core's init function.
          return _super.call(this, o);
        };
      })(Howl.prototype.init);
    
      /**
      * Sets or gets Q factor for the Howl's filter.
      * Future Howls will not use this value unless explicitly set.
      * @param  {Number} q Q Factor, a value between 0.001 - 1000.0; determines resonance peak at cutoff for LPF and HPF or bandwidth for notch and BPF.
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/Number}     Self or current Q value.
      */
      Howl.prototype.qFactor = function(q, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'qFactor',
            action: function() {
              self.qFactor(q, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (typeof q === 'number') {
            self._q = q;
          } else {
            return self._q;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (typeof q === 'number') {
              if (sound._node) {
                self._q = q;
                if (!sound._filterNode) {
                  setupFilter(sound);
                }

                sound._filterNode.Q.value = q;
                self._emit('qFactor', sound._id);
              }
            } else {
              return sound._q;
            }
          }
        }
    
        return self;
      };

      /**
      * Helper method to update the frequency of all current Howl filters. Depending on the filter type, this will either be the cutoff (for HPF and LPF)
      * or center frequency (for notch and BPF).
      * Future Howls will not use this value unless explicitly set.
      * @param  {String} f Frequency between 10 and Nyquist.
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/String}     Self or current filter type.
      */
      Howl.prototype.filterType = function(type, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'filterType',
            action: function() {
              self.filterType(type, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (type === 'lowpass' ||
              type === 'highpass'||
              type === 'bandpass'||
              type === 'notch') {
            self._filterType = type;
          } else {
            return self._filterType;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (type === 'lowpass' ||
                type === 'highpass'||
                type === 'bandpass'||
                type === 'notch') {
              sound._filterType = type;
    
              if (sound._node) {
    
                if (!sound._filterNode) {
                  setupFilter(sound);
                }

                sound._filterNode.type = type;
                self._emit('filterType', sound._id);
              }
            } else {
              return sound._filterType;
            }
          }
        }
    
        return self;
      };

      /**
      * Helper method to update the frequency of current Howl filter. Depending on the filter type, this will either be the cutoff (for HPF and LPF)
      * or center frequency (for notch and BPF).
      * Future Howls will not use this value unless explicitly set.
      * @param  {Number} f Frequency between 10 and Nyquist.
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/Number}     Self or current frequency value.
      */
      Howl.prototype.frequency = function(f, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'frequency',
            action: function() {
              self.frequency(f, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (typeof f === 'number'){
            self._frequency = f;
          } else {
            return self._frequency;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (typeof f === 'number'){
              sound._frequency = f;
    
              if (sound._node) {
    
                if (!sound._filterNode) {
                  setupFilter(sound);
                }

                sound._filterNode.frequency.value = f;
                self._emit('frequency', sound._id);
              }
            } else {
              return sound._frequency;
            }
          }
        }
    
        return self;
      };

      /**
      * Helper method to update multiple filter parameters at once
      * filterType is a string describing the type of filter; 'highpass', 'lowpass', 'bandpass', or 'notch'
      * Q is the quality factor of the filter. Depending on the type, it affects resonance peak at the cutoff or bandwidth
      * frequency is either the cutoff or center frequency, depending on filter type
      * @param  {Object} filterParams Object of parameters to set for filter. {filterType: string, Q: number, frequency: number}
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl}     Self.
      */
      Howl.prototype.addFilter = function(filterParams, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'addFilter',
            action: function() {
              self.addFilter(filterParams, id);
            }
          });
    
          return self;
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
              if (sound._node) {
    
                if (!sound._filterNode) {
                  setupFilter(sound);
                }
                sound._filterNode.frequency.value = filterParams.frequency || sound._frequency;
                sound._filterNode.Q.value = filterParams.Q || sound._q;
                sound._filterNode.type = filterParams.filterType || sound._filterType;
                self._emit('addFilter', sound._id);
              }
          }
        }
    
        return self;
      };
    
      /** Single Sound Methods **/
      /***************************************************************************/
    
      /**
       * Add new properties to the core Sound init.
       * @param  {Function} _super Core Sound init method.
       * @return {Sound}
       */
      Sound.prototype.init = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;
    
          // Setup user-defined default properties.
          self._q = parent._q;
          self._filterType = parent._filterType;
          self._frequency = parent._frequency;
    
          // Complete initilization with howler.js core Sound's init function.
          _super.call(this);
        };
      })(Sound.prototype.init);
    
      /**
       * Override the Sound.reset method to clean up properties from the filters plugin.
       * @param  {Function} _super Sound reset method.
       * @return {Sound}
       */
      Sound.prototype.reset = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;
    
          // Reset all filters plugin properties on this sound.
          self._q = parent._q;
          self._filterType = parent._filterType;
          self._frequency = parent._frequency;
    
          // Complete resetting of the sound.
          return _super.call(this);
        };
      })(Sound.prototype.reset);
    
      /** Helper Methods **/
      /***************************************************************************/

      var setupFilter = function(sound) {
        // Create the new convolver send gain node.
        sound._filterNode = Howler.ctx.createBiquadFilter();
        // set default gain node values
        sound._filterNode.gain.value = 1.0;
        sound._filterNode.frequency.value = sound._frequency || 1000.0;
        sound._filterNode.type = sound._filterType || "lowpass";
        sound._filterNode.Q.value = sound._q || 1.0;
        // connect sound's gain node to convolver send gain node
        sound._fxInsertIn.disconnect();
        sound._fxInsertIn.connect(sound._filterNode);
        sound._filterNode.connect(sound._fxInsertOut);
        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };
    })();
    