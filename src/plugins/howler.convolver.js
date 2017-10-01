/*

attribute impulse response to: 
www.openairlib.net
Audiolab, University of York
Marcin Gorzel
Gavin Kearney
Aglaia Foteinou
Sorrel Hoare
Simon Shelley

TODO

problem : how do we connect an external node to howler sounds 
          without messing up the audio configuration currently in place?

1) only allow parallel processing: on sound creation, make a 
"_convolverSend" gain node. Howl convolver methods control this send, which is just a gain node
Global method control properties of global convolvers by name


Local Properties/Functionality
- wet send (normal volume is dry send)
- name of convolution impulse response (custom or built-in)

Global
- add convolver -> takes in name of impulse response, loads it, and allows individual sounds to connect to it
- remove convolver
- set master wet level

todo -> add filters into the mix

------------------------
|                       |
| Howler Global Context |
|                       |
------------------------
          |
          v global
      ------------          --------------------    
      | convolver | ------> | master gain node | -----> out
      ------------          --------------------
          ^                        ^   
          |                        |         
          |  per sound             |       
       -----------------           |      
       | convolverSend |           |         
       -----------------           |       
                     ^             |          
                     |             |       
                     |             |       
---------          ---------       |       
| sound |  ----->  | _node | -------              
---------          ---------            

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
    
      // Setup default properties.
      
      /** Global Methods **/
      /***************************************************************************/

      // createConvolver (takes in impulse response and optional key and loads it)
      // removeConvolver
      // set global convolver send
      // get global convolver send
    
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
        xhr.send(null);

        // set default convolver attributes
        // connect convolver to ctx.masterGain
        // add convolver to map

        return self;
      };

    
      HowlerGlobal.prototype.removeConvolver = function(convolverName) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // search if convolver already exists by that name
    
        return self;
      };

      HowlerGlobal.prototype.setConvolverMasterSend = function(convolverName, sendLevel) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // search if convolver already exists by that name
    
        return 0.0; // return send level or self
      };

      HowlerGlobal.prototype.getConvolverMasterSend = function(convolverName) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self.ctx || !self.ctx.listener) {
          return self;
        }

        // search if convolver already exists by that name
    
        return 0.0; // return send level or self
      };



      /** Group Methods **/
      /***************************************************************************/

      // init howl with convolver settings 
      // send to convolver
      // remove from convolver
      // set convolverSend
      // get convolverSend
    
      /**
       * Add new properties to the core init.
       * @param  {Function} _super Core init method.
       * @return {Howl}
       */
      Howl.prototype.init = (function(_super) {
        return function(o) {
          var self = this;
    
          // Setup user-defined default properties.
    
          // Setup event listeners.
    
          // Complete initilization with howler.js core's init function.
          return _super.call(this, o);
        };
      })(Howl.prototype.init);
    


      Howl.prototype.sendToConvolver = function(convolverName, sendLevel) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
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
          }
        }
    
        return self;
      };
    
      Howl.prototype.removeFromConvolver = function(convolverName) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'stereo',
            action: function() {
              // remove from convolver
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
          }
        }
    
        return self;
      };

      Howl.prototype.setConvolverSendLevel = function(sendLevel) {
        var self = this;
    
        // Stop right here if not using Web Audio.
        if (!self._webAudio) {
          return self;
        }
    
        // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
        if (self._state !== 'loaded') {
          self._queue.push({
            event: 'stereo',
            action: function() {
              // setConvolverSend
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
          }
        }
    
        return self;
      };

      /** Single Sound Methods **/ 
      /***************************************************************************/

      // send to convolver
      // remove from convolver
    
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
    
          // Reset all spatial plugin properties on this sound.
    
          // Complete resetting of the sound.
          return _super.call(this);
        };
      })(Sound.prototype.reset);
    
      /** Helper Methods **/
      /***************************************************************************/

      /**
       * Create a new panner node and save it on the sound.
       * @param  {Sound} sound Specific sound to setup panning on.
       * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
       */
      var setupConvolverSend = function(sound) {
        // Create the new convolver send gain node.
        sound._convolverSend = Howler.ctx.createGain();
        // set default gain node values
        sound._convolverSend.gain.value = 1.0;
        // connect sound's gain node to convolver send gain node
        sound._node.connect(sound._convolverSend);
        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };

            /**
       * Create a new panner node and save it on the sound.
       * @param  {Sound} sound Specific sound to setup panning on.
       * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
       */
      var removeConvolverSend = function(sound) {
        type = type || 'spatial';

        // Disconnect convolver send node

        // Update the connections.
        if (!sound._paused) {
          sound._parent.pause(sound._id, true).play(sound._id);
        }
      };
    })();
    