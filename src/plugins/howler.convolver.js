/*

Example of parallel processing, used for time based effects such as reverb and delay

------------------------
|                       |
| Howler Audio Context  |
|                       |
------------------------
          |
          v global (0 to many)
      ------------          --------------------    
      | convolver | ------> | master gain node | -----> out
      ------------          --------------------
          ^                           ^   
          |                           |         
          |  per sound                |       
       -----------------              |      
       | convolverSend |              |         
       -----------------              |       
                     ^                |          
                     |                |       
                     |                |       
---------------    -----------        |       
|              |-->| _fxSend |        |
|              |   -----------        |
| bufferSource |         _________    |
|              | ----->  | _node | ----              
---------------          ---------            

        */  


/*!
 *  Convolver Plugin - Adds support for convolving howls with built-in or custom impulse responses
 *                     where Web Audio is supported. Convolution is most commonly used to apply 
 *                     reverb characteristics of a space to an arbitrary sound, but creative effects can
 *                     also be achieved by convolving your sounds with other audio files. 
 *                     (http://iub.edu/~emusic/etext/synthesis/chapter4_convolution.shtml)
 *                     - Plugin by Jack Campbell
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
      
      /** Global Methods **/
      /***************************************************************************/
    
      /**
       * Load an impulse response and register its name to be used as a convolver
       * @param  {String} convolverName Name of convolver to connect to
       * @param  {String} impulseResponse URL of impulse response audio file to load
       * @param  {Function} callback Callback called when impulse response is loaded
       * @return {HowlerGlobal}
       */
      HowlerGlobal.prototype.addConvolver = function(convolverName, impulseResponse, callback) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }
        if(!self._convolvers) { self._convolvers = {}; }
        // search if convolver already exists by that name
        if(self._convolvers[convolverName])
        {
            console.warn('A convolver already exists under this name.');
            return self;
        }


        var xhr = new XMLHttpRequest();
        if (!impulseResponse) {
            console.log("Could not find IR at supplied path");
            return;
        }

        xhr.open("GET", impulseResponse, true);
        xhr.responseType = "arraybuffer";
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status < 300 && xhr.status > 199 || xhr.status === 302) {
                    Howler.ctx.decodeAudioData(xhr.response, function(buffer) {
                        // create convolver
                        let convolver = Howler.ctx.createConvolver();
                        convolver.connect(Howler.masterGain);
                        convolver.buffer = buffer;
                        self._convolvers[convolverName] = convolver;
                        if(callback)
                        {
                            callback();
                        }
                    }, function(e) {
                        if (e) console.log("Error decoding IR audio data" + e);
                    });
                }
            }
        };
        xhr.send();
        return self;
      };

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
          self._convolverVolume = o.convolverVolume || 1.0;
        
          // Complete initilization with howler.js core's init function.
          return _super.call(this, o);
        };
      })(Howl.prototype.init);


      /**
       * Connect Howl's FX send to a convolver (created globally)
       * @param  {String} convolverName Name of convolver to connect to
       * @param  {Number} sendLevel Amount of gain to send 
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl}
       */
      Howl.prototype.sendToConvolver = function(convolverName, sendLevel, id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        if (!(self._state === 'loaded' && Howler._convolvers[convolverName]))
        {
          self._queue.push({
            event: 'sendToConvolver',
            action: function() {
              self.sendToConvolver(convolverName, sendLevel);
            }
          });
          return self;
        }
        // send all sounds in group to the convolver
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
              // if sound doesn't have a convolver send yet, create one
              if(!sound._convolverSend){
                  setupConvolverSend(sound);
              }
              // connect convolverSend gain node to master convolverNode
              sound._convolverSend.connect(Howler._convolvers[convolverName]);
              // set the send level
              sound._convolverSend.gain.setValueAtTime(sendLevel, Howler.ctx.currentTime);
              self._emit('sendToConvolver', sound._id);
          }
        }
    
        return self;
      };
    
      /**
       * Remove Howl from convolver
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl}
       */
      Howl.prototype.removeFromConvolver = function(id) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'removeFromConvolver',
            action: function() {
              // remove from convolver
              self.removeFromConvolver();
            }
          });
          return self;
        }
    
        // send all sounds in group to the convolver
        var ids = self._getSoundIds(id);
        for (var i=0; i<ids.length; i++) {
          // Get the sound.
          var sound = self._soundById(ids[i]);
    
          if (sound) {
              // remove from convolver
              if(sound._convolverSend)
              {
                removeConvolverSend(sound);
              }
              self._emit('removeFromConvolver', sound._id);
          }
        }
    
        return self;
      };
      
      /**
       * Get/set the send level for this Howl.
       * @param  {Float} sendLevel Send level from 0.0 to 1.0.
       * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
       * @return {Howl/Float}     Returns self or current send level.
       */
      Howl.prototype.convolverVolume = function(sendLevel, id) {
        var self = this;
        var args = arguments;  
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }



        if (typeof id === 'undefined') {
          if (typeof sendLevel === 'number') {
            self._convolverVolume = sendLevel;
          }
        }

        if(sendLevel === undefined) 
        { 
          return self._convolverVolume; 
        }
        
        if (sendLevel >= 0 && sendLevel <= 1) {
          if (self._state !== 'loaded') {
            self._queue.push({
              event: 'convolverVolume',
              action: function() {
                self.convolverVolume(sendLevel);
              }
            });
            return self;
          }
          // send all sounds in group to the convolver
          var ids = self._getSoundIds(id);
          for (var i=0; i<ids.length; i++) {
            // Get the sound.
            var sound = self._soundById(ids[i]);
          
            if (sound) {
                // set sound's convolver send gain node to the gain value
                if (sound._convolverSend && !sound._muted) {
                  sound._convolverSend.gain.setValueAtTime(sendLevel, Howler.ctx.currentTime);
                }
                self._emit('convolverVolume', sound._id);
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
          self._convolverVolume = parent._convolverVolume;
    
          // Complete initilization with howler.js core Sound's init function.
          _super.call(this);
        };
      })(Sound.prototype.init);
    
      /**
       * Override the Sound.reset method to clean up properties from the spatial plugin.
       * @param  {Function} _super Sound reset method.
       * @return {Sound}
       */
      Sound.prototype.reset = (function(_super) {
        return function() {
          var self = this;
          var parent = self._parent;
    
          // Setup user-defined default properties.
          self._convolverVolume = parent._convolverVolume;
    
          // Complete resetting of the sound.
          return _super.call(this);
        };
      })(Sound.prototype.reset);
    
      /** Helper Methods **/
      /***************************************************************************/

      /**
      * Create a new gain node that attaches to the fx send and can be connected to a convolver
      * @param  {Sound} sound Specific sound to setup convolver send on.
      */
      var setupConvolverSend = function(sound) {
        // Create the new convolver send gain node.
        sound._convolverSend = Howler.ctx.createGain();
        // set default gain node values
        sound._convolverSend.gain.value = 1.0;
        // connect sound's gain node to convolver send gain node
        sound._fxSend.connect(sound._convolverSend);
        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };

      /**
      * Disconnect the sound's convolver send from a convolver
      * @param  {Sound} sound Specific sound to remove convolver connection on.
      */
      var removeConvolverSend = function(sound) {
        // Disconnect convolver send node
        sound._convolverSend.disconnect(0);

        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };
    })();
    