/*!
 *  Delay Plugin - Adds support for delay effects on Howlers where Web Audio is supported. 
 *                 This is a time-based send effect approach.
 *                 - Jack Campbell jcampbellcodes
 * 
 *  howler.js v2.0.4
 *  howlerjs.com
 *
 *  (c) 2013-2017, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 * 
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
        
          // Setup user-defined default properties.
          self._delayVolume = o.delayVolume || 1.0;
          self._delayFeedback = o.delayFeedback || 0.0;
          self._delayTime = o.delayTime || 0.5;

          // Setup event listeners.
          self._ondelayVolume = o.ondelayVolume ? [{fn: o.ondelayVolume}] : [];
          self._ondelayFeedback = o.ondelayFeedback ? [{fn: o.ondelayFeedback}] : [];
          self._ondelayTime = o.ondelayTime ? [{fn: o.ondelayTime}] : [];
        
          // Complete initilization with howler.js core's init function.
          return _super.call(this, o);
        };
      })(Howl.prototype.init);


      /**
      * Get/set the amount of the sound's volume sent to the delay line.
      * @param  {Number} vol  The delay send amount from 0 to 1.
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/Array}    Returns self or the current delay send value
      */
      Howl.prototype.delayVolume = function(vol, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio || vol < 0.0 || vol > 1.0) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'delayVolume',
            action: function() {
              self.delayVolume(vol, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (typeof vol === 'number'){
            self._delayVolume = vol;
          } else {
            return self._delayVolume;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (typeof vol === 'number'){
              sound._delayVolume = vol;
    
              if (sound._node) {
    
                if (!sound._delaySend) {
                  setupDelay(sound);
                }

                sound._delaySend.gain.value = vol;
                self._emit('delayVolume', sound._id);
              }
            } else {
              return sound._delayVolume;
            }
          }
        }
    
        return self;
      };

      /**
      * Get/set the amount of the delay feedback percent. This affects how many times the delayed signal will repeat
      * at the set delayTime interval  
      * @param  {Number} feedback  Normalized percentage of feedback amount from 0.0 to <1.0
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/Array}    Returns self or the current delay feedback value
      */
      Howl.prototype.delayFeedback = function(feedback, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio || feedback < 0 || feedback >= 1.0) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'delayFeedback',
            action: function() {
              self.delayFeedback(feedback, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (typeof feedback === 'number'){
            self._delayFeedback = feedback;
          } else {
            return self._delayFeedback;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (typeof feedback === 'number'){
              sound._delayFeedback = feedback;
    
              if (sound._node) {
    
                if (!sound._delayFBNode) {
                  setupDelay(sound);
                }

                sound._delayFBNode.gain.value = feedback;
                self._emit('delayFeedback', sound._id);
              }
            } else {
              return sound._delayFeedback;
            }
          }
        }
    
        return self;
      };


     /**
      * Get/set the delay time. This value determines how long each delayed version of the signal will play.
      * @param  {Number} time  The delay time from 0 to 5.0
      * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
      * @return {Howl/Array}    Returns self or the current delay time value
      */
      Howl.prototype.delayTime = function(time, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change q when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'delayTime',
            action: function() {
              self.delayTime(time, id);
            }
          });
    
          return self;
        }

        if (typeof id === 'undefined') {
          if (typeof time === 'number'){
            self._delayTime = time;
          } else {
            return self._delayTime;
          }
        }

        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
            if (typeof time === 'number'){
              sound._delayTime = time;
    
              if (sound._node) {
    
                if (!sound._delayNode) {
                  setupDelay(sound);
                }

                sound._delayNode.delayTime.value = time;
                self._emit('delayTime', sound._id);
              }
            } else {
              return sound._delayTime;
            }
          }
        }
    
        return self;
      };

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
          self._delayVolume = parent._delayVolume || 1.0;
          self._delayFeedback = parent._delayFeedback || 0.0;
          self._delayTime = parent._delayTime || 0.5;
    
          // Complete initilization with howler.js core Sound's init function.
          _super.call(this);
        };
      })(Sound.prototype.init);
    
      /**
       * Override the Sound.reset method to clean up properties.
       * @param  {Function} _super Sound reset method.
       * @return {Sound}
       */
      Sound.prototype.reset = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;
    
          // Setup user-defined default properties.
          self._delayVolume = parent._delayVolume || 1.0;
          self._delayFeedback = parent._delayFeedback || 0.0;
          self._delayTime = parent._delayTime || 0.5;
    
          // Complete resetting of the sound.
          return _super.call(this);
        };
      })(Sound.prototype.reset);
    
      /** Helper Methods **/
      /***************************************************************************/

      var setupDelay = function(sound) {
        // Create the effects chain
        sound._delaySend = Howler.ctx.createGain(); // amount of input signal sent to the delay node
        sound._delayNode = Howler.ctx.createDelay(5.0); // actual delay node
        sound._delayFBNode = Howler.ctx.createGain(); // attenuated signal is fed back into the delay node
        // set default gain node values
        sound._delaySend.gain.value = sound._delayVolume || 1.0;
        sound._delayNode.delayTime.value = sound._delayTime || 0.5;
        sound._delayFBNode.gain.value = sound._delayFeedback || 0.0;

        // make connections
        sound._fxSend.connect(sound._delaySend); // hook into the general fxSend on the sound
        sound._delaySend.connect(sound._delayNode); // hook the send to the delay
        sound._delayNode.connect(sound._delayFBNode); // send output of delay to feedback
        sound._delayFBNode.connect(sound._delayNode); // delay receives an attenuated form of the signal to delay again
        sound._delayNode.connect(Howler.masterGain); // the accumulated delayed signals are sent to the output

        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };
    })();
    