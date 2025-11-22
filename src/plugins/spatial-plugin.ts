/*!
 *  Spatial Plugin for Howler.js
 *  Adds 3D spatial audio and stereo panning support
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import type { HowlOptions } from '../howler.core';
import { Howl, Howler, HowlerGlobal, Sound } from '../howler.core';
import { HowlerPlugin, type PluginHooks, globalPluginManager } from './plugin';

/**
 * Extended HowlOptions with spatial audio properties
 */
export interface SpatialHowlOptions extends HowlOptions {
  pos?: [number, number, number];
  orientation?: [number, number, number];
  stereo?: number;
  coneInnerAngle?: number;
  coneOuterAngle?: number;
  coneOuterGain?: number;
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  maxDistance?: number;
  panningModel?: 'equalpower' | 'HRTF';
  refDistance?: number;
  rolloffFactor?: number;
  onstereo?: () => void;
  onpos?: () => void;
  onorientation?: () => void;
}

/**
 * Spatial audio properties for HowlerGlobal
 */
export interface SpatialAudioState {
  _pos: [number, number, number];
  _orientation: [number, number, number, number, number, number];
}

/**
 * Spatial audio properties for Howl
 */
export interface SpatialHowlState {
  _pos: [number, number, number] | null;
  _orientation: [number, number, number];
  _stereo: number | null;
  _pannerAttr: {
    coneInnerAngle: number;
    coneOuterAngle: number;
    coneOuterGain: number;
    distanceModel: 'linear' | 'inverse' | 'exponential';
    maxDistance: number;
    panningModel: 'equalpower' | 'HRTF';
    refDistance: number;
    rolloffFactor: number;
  };
  _onstereo: Array<{ fn: () => void }>;
  _onpos: Array<{ fn: () => void }>;
  _onorientation: Array<{ fn: () => void }>;
}

/**
 * Spatial audio properties for Sound
 */
export interface SpatialSoundState {
  _pos: [number, number, number] | null;
  _orientation: [number, number, number];
  _stereo: number | null;
  _pannerAttr: {
    coneInnerAngle: number;
    coneOuterAngle: number;
    coneOuterGain: number;
    distanceModel: 'linear' | 'inverse' | 'exponential';
    maxDistance: number;
    panningModel: 'equalpower' | 'HRTF';
    refDistance: number;
    rolloffFactor: number;
  };
}

/**
 * Howler instance with spatial audio capabilities
 * Use this type when the spatial plugin is registered
 * 
 * @example
 * ```typescript
 * import { Howler } from 'howler';
 * import { SpatialAudioPlugin, type SpatialHowler } from 'howler/plugins/spatial';
 * 
 * Howler.addPlugin(new SpatialAudioPlugin());
 * 
 * const howler: SpatialHowler = Howler as SpatialHowler;
 * howler.pos(10, 20, 30);
 * ```
 */
export type SpatialHowler = HowlerGlobal & SpatialAudioState & {
  pos(x?: number, y?: number, z?: number): SpatialHowler | [number, number, number];
  orientation(x?: number, y?: number, z?: number, xUp?: number, yUp?: number, zUp?: number): SpatialHowler | [number, number, number, number, number, number];
  stereo(pan?: number): SpatialHowler;
};

/**
 * Howl instance with spatial audio capabilities
 * Use this type when the spatial plugin is registered
 * 
 * @example
 * ```typescript
 * import { Howl } from 'howler';
 * import { SpatialAudioPlugin, type SpatialHowl, type SpatialHowlOptions } from 'howler/plugins/spatial';
 * 
 * Howler.addPlugin(new SpatialAudioPlugin());
 * 
 * const sound: SpatialHowl = new Howl({
 *   src: ['sound.mp3'],
 *   pos: [10, 20, 30]
 * } as SpatialHowlOptions) as SpatialHowl;
 * 
 * sound.pos(5, 10, 15);
 * sound.stereo(0.5);
 * ```
 */
export type SpatialHowl = Howl & SpatialHowlState & {
  pos(x?: number, y?: number, z?: number, id?: number): SpatialHowl | [number, number, number];
  orientation(x?: number, y?: number, z?: number, id?: number): SpatialHowl | [number, number, number];
  stereo(pan?: number, id?: number): SpatialHowl | number;
  pannerAttr(o?: any, id?: number): SpatialHowl | any;
};

/**
 * Setup a panner node for a sound
 */
function setupPanner(sound: Sound & SpatialSoundState, type: 'stereo' | 'spatial' = 'spatial'): void {
  if (!Howler.ctx) {
    return;
  }

  // Create the new panner node
  if (type === 'spatial') {
    sound._panner = Howler.ctx.createPanner();
    const panner = sound._panner as PannerNode;
    panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
    panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
    panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
    panner.distanceModel = sound._pannerAttr.distanceModel;
    panner.maxDistance = sound._pannerAttr.maxDistance;
    panner.refDistance = sound._pannerAttr.refDistance;
    panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
    panner.panningModel = sound._pannerAttr.panningModel;

    if (sound._pos) {
      if (typeof (panner as any).positionX !== 'undefined') {
        (panner as any).positionX.setValueAtTime(sound._pos[0], Howler.ctx!.currentTime);
        (panner as any).positionY.setValueAtTime(sound._pos[1], Howler.ctx!.currentTime);
        (panner as any).positionZ.setValueAtTime(sound._pos[2], Howler.ctx!.currentTime);
      } else {
        panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
      }
    }

    if (typeof (panner as any).orientationX !== 'undefined') {
      (panner as any).orientationX.setValueAtTime(sound._orientation[0], Howler.ctx!.currentTime);
      (panner as any).orientationY.setValueAtTime(sound._orientation[1], Howler.ctx!.currentTime);
      (panner as any).orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx!.currentTime);
    } else {
      panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
    }
  } else {
    sound._panner = Howler.ctx.createStereoPanner();
    const stereoPanner = sound._panner as StereoPannerNode;
    if (sound._stereo !== null) {
      stereoPanner.pan.setValueAtTime(sound._stereo, Howler.ctx!.currentTime);
    }
  }

  // Connect panner to the sound's node
  sound._panner.connect(sound._node);

  // Update connections if sound is playing
  if (!sound._paused) {
    (sound._parent as any).pause(sound._id, true);
    (sound._parent as any).play(sound._id, true);
  }
}

/**
 * Mixin function to add spatial audio to HowlerGlobal (listener)
 */
function withSpatialListener(instance: HowlerGlobal): HowlerGlobal & SpatialAudioState & {
  pos(x?: number, y?: number, z?: number): any;
  orientation(x?: number, y?: number, z?: number, xUp?: number, yUp?: number, zUp?: number): any;
  stereo(pan?: number): any;
} {
  const spatial = instance as any;

  // Initialize spatial properties
  spatial._pos = [0, 0, 0];
  spatial._orientation = [0, 0, -1, 0, 1, 0];

  // Add pos method to set listener position
  spatial.pos = function (x?: number, y?: number, z?: number) {
    if (!this.ctx || !this.ctx.listener) {
      return this;
    }

    // Set the defaults for optional 'y' & 'z'
    y = typeof y !== 'number' ? this._pos[1] : y;
    z = typeof z !== 'number' ? this._pos[2] : z;

    if (typeof x === 'number') {
      this._pos = [x, y, z];

      if (typeof this.ctx.listener.positionX !== 'undefined') {
        (this.ctx.listener.positionX as any).setTargetAtTime(this._pos[0], Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.positionY as any).setTargetAtTime(this._pos[1], Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.positionZ as any).setTargetAtTime(this._pos[2], Howler.ctx!.currentTime, 0.1);
      } else {
        (this.ctx.listener as any).setPosition(this._pos[0], this._pos[1], this._pos[2]);
      }
    } else {
      return this._pos;
    }

    return this;
  };

  // Add orientation method to set listener orientation
  spatial.orientation = function (
    x?: number,
    y?: number,
    z?: number,
    xUp?: number,
    yUp?: number,
    zUp?: number
  ) {
    if (!this.ctx || !this.ctx.listener) {
      return this;
    }

    // Set the defaults for optional parameters
    const or = this._orientation;
    y = typeof y !== 'number' ? or[1] : y;
    z = typeof z !== 'number' ? or[2] : z;
    xUp = typeof xUp !== 'number' ? or[3] : xUp;
    yUp = typeof yUp !== 'number' ? or[4] : yUp;
    zUp = typeof zUp !== 'number' ? or[5] : zUp;

    if (typeof x === 'number') {
      this._orientation = [x, y, z, xUp, yUp, zUp];

      if (typeof this.ctx.listener.forwardX !== 'undefined') {
        (this.ctx.listener.forwardX as any).setTargetAtTime(x, Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.forwardY as any).setTargetAtTime(y, Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.forwardZ as any).setTargetAtTime(z, Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.upX as any).setTargetAtTime(xUp, Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.upY as any).setTargetAtTime(yUp, Howler.ctx!.currentTime, 0.1);
        (this.ctx.listener.upZ as any).setTargetAtTime(zUp, Howler.ctx!.currentTime, 0.1);
      } else {
        (this.ctx.listener as any).setOrientation(x, y, z, xUp, yUp, zUp);
      }
    } else {
      return or;
    }

    return this;
  };

  // Add stereo method
  spatial.stereo = function (pan?: number) {
    if (!this.ctx || !this.ctx.listener) {
      return this;
    }

    // Loop through all Howls and update their stereo panning
    for (let i = this._howls.length - 1; i >= 0; i--) {
      (this._howls[i] as any).stereo?.(pan);
    }

    return this;
  };

  return spatial;
}

/**
 * Spatial Audio Plugin
 * Adds 3D spatial audio and stereo panning capabilities to Howler and Howl instances
 */
export class SpatialAudioPlugin extends HowlerPlugin {
  readonly name = 'spatial-audio';
  readonly version = '1.0.0';

  getHooks(): PluginHooks {
    return {
      onHowlerInit: this.onHowlerInit.bind(this),
      onHowlCreate: this.onHowlCreate.bind(this),
      onSoundCreate: this.onSoundCreate.bind(this),
      onHowlLoad: this.onHowlLoad.bind(this),
    };
  }

  /**
   * Initialize spatial audio when Howler is initialized
   * This is called either:
   * - When Howler initializes (if plugin was registered before)
   * - Immediately during registration (if Howler is already initialized)
   */
  private onHowlerInit(howler: HowlerGlobal): void {
    withSpatialListener(howler);
  }

  /**
   * Extend Howl instances with spatial audio methods
   */
  private onHowlCreate(howl: Howl, options: HowlOptions): void {
    const spatialOptions = options as SpatialHowlOptions;
    const spatial = howl as any;

    // Setup user-defined default properties
    spatial._orientation = spatialOptions.orientation || [1, 0, 0];
    spatial._stereo = spatialOptions.stereo !== undefined ? spatialOptions.stereo : null;
    spatial._pos = spatialOptions.pos || null;
    spatial._pannerAttr = {
      coneInnerAngle: typeof spatialOptions.coneInnerAngle !== 'undefined' ? spatialOptions.coneInnerAngle : 360,
      coneOuterAngle: typeof spatialOptions.coneOuterAngle !== 'undefined' ? spatialOptions.coneOuterAngle : 360,
      coneOuterGain: typeof spatialOptions.coneOuterGain !== 'undefined' ? spatialOptions.coneOuterGain : 0,
      distanceModel: typeof spatialOptions.distanceModel !== 'undefined' ? spatialOptions.distanceModel : 'inverse',
      maxDistance: typeof spatialOptions.maxDistance !== 'undefined' ? spatialOptions.maxDistance : 10000,
      panningModel: typeof spatialOptions.panningModel !== 'undefined' ? spatialOptions.panningModel : 'HRTF',
      refDistance: typeof spatialOptions.refDistance !== 'undefined' ? spatialOptions.refDistance : 1,
      rolloffFactor: typeof spatialOptions.rolloffFactor !== 'undefined' ? spatialOptions.rolloffFactor : 1,
    };

    // Setup event listeners
    spatial._onstereo = spatialOptions.onstereo ? [{ fn: spatialOptions.onstereo }] : [];
    spatial._onpos = spatialOptions.onpos ? [{ fn: spatialOptions.onpos }] : [];
    spatial._onorientation = spatialOptions.onorientation ? [{ fn: spatialOptions.onorientation }] : [];

    // Add stereo method
    spatial.stereo = function (pan?: number, id?: number) {
      const self = this as any;

      // Stop right here if not using Web Audio
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'stereo',
          action: function () {
            self.stereo(pan, id);
          },
        });
        return self;
      }

      // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist
      const pannerType =
        typeof Howler.ctx!.createStereoPanner !== 'undefined' ? 'stereo' : 'spatial';

      const ids = self._getSoundIds(id);
      for (let i = 0; i < ids.length; i++) {
        const sound = self._soundById(ids[i]) as any;
        if (sound) {
          sound._stereo = pan;

          // Create a new panner node if one doesn't already exist
          if (!sound._panner) {
            // Make sure we have a position to setup the node with
            if (!sound._pos) {
              sound._pos = self._pos || [0, 0, -0.5];
            }
            setupPanner(sound, pannerType);
          } else if (pannerType === 'stereo' && sound._panner instanceof StereoPannerNode) {
            sound._panner.pan.setValueAtTime(pan, Howler.ctx!.currentTime);
          }
        }
      }

      // Fire event
      self._emit('stereo', id);

      return self;
    };

    // Add pos method
    spatial.pos = function (x?: number, y?: number, z?: number, id?: number) {
      const self = this as any;

      // Stop right here if not using Web Audio
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'pos',
          action: function () {
            self.pos(x, y, z, id);
          },
        });
        return self;
      }

      // Set the defaults for optional 'y' & 'z'
      y = typeof y !== 'number' ? (self._pos ? self._pos[1] : 0) : y;
      z = typeof z !== 'number' ? (self._pos ? self._pos[2] : 0) : z;

      if (typeof x === 'number') {
        const ids = self._getSoundIds(id);
        for (let i = 0; i < ids.length; i++) {
          const sound = self._soundById(ids[i]) as any;
          if (sound) {
            sound._pos = [x, y, z];

            // Create a new panner node if one doesn't already exist
            if (!sound._panner) {
              setupPanner(sound, 'spatial');
            } else if (sound._panner instanceof PannerNode) {
              // Update position
              if (typeof (sound._panner as any).positionX !== 'undefined') {
                (sound._panner as any).positionX.setValueAtTime(x, Howler.ctx!.currentTime);
                (sound._panner as any).positionY.setValueAtTime(y, Howler.ctx!.currentTime);
                (sound._panner as any).positionZ.setValueAtTime(z, Howler.ctx!.currentTime);
              } else {
                sound._panner.setPosition(x, y, z);
              }
            }
          }
        }

        // Fire event
        self._emit('pos', id);

        return self;
      } else {
        // Return the position of the first sound or the group's position
        if (typeof id === 'number') {
          const sound = self._soundById(id) as any;
          return sound ? sound._pos || [0, 0, 0] : [0, 0, 0];
        }
        return self._pos || [0, 0, 0];
      }
    };

    // Add orientation method
    spatial.orientation = function (x?: number, y?: number, z?: number, id?: number) {
      const self = this as any;

      // Stop right here if not using Web Audio
      if (!self._webAudio) {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue
      if (self._state !== 'loaded') {
        self._queue.push({
          event: 'orientation',
          action: function () {
            self.orientation(x, y, z, id);
          },
        });
        return self;
      }

      // Set the defaults for optional 'y' & 'z'
      y = typeof y !== 'number' ? self._orientation[1] : y;
      z = typeof z !== 'number' ? self._orientation[2] : z;

      if (typeof x === 'number') {
        const ids = self._getSoundIds(id);
        for (let i = 0; i < ids.length; i++) {
          const sound = self._soundById(ids[i]) as any;
          if (sound) {
            sound._orientation = [x, y, z];

            // Create a new panner node if one doesn't already exist
            if (!sound._panner) {
              if (!sound._pos) {
                sound._pos = self._pos || [0, 0, -0.5];
              }
              setupPanner(sound, 'spatial');
            } else if (sound._panner instanceof PannerNode) {
              // Update orientation
              if (typeof (sound._panner as any).orientationX !== 'undefined') {
                (sound._panner as any).orientationX.setValueAtTime(x, Howler.ctx!.currentTime);
                (sound._panner as any).orientationY.setValueAtTime(y, Howler.ctx!.currentTime);
                (sound._panner as any).orientationZ.setValueAtTime(z, Howler.ctx!.currentTime);
              } else {
                sound._panner.setOrientation(x, y, z);
              }
            }
          }
        }

        // Fire event
        self._emit('orientation', id);

        return self;
      } else {
        // Return the orientation of the first sound or the group's orientation
        if (typeof id === 'number') {
          const sound = self._soundById(id) as any;
          return sound ? sound._orientation : [1, 0, 0];
        }
        return self._orientation;
      }
    };

    // Add pannerAttr method
    spatial.pannerAttr = function (o?: any, id?: number) {
      const self = this as any;
      const args = arguments;
      let sound: any = null;

      if (args.length === 0) {
        // Return this sound's panner attribute values
        return self._pannerAttr;
      } else if (args.length === 1) {
        if (typeof args[0] === 'number') {
          // Return this sound's panner attribute values
          sound = self._soundById(parseInt(args[0] as any, 10));
          return sound ? sound._pannerAttr : self._pannerAttr;
        } else {
          // Update all sounds in the group
          o = args[0];
        }
      } else if (args.length === 2) {
        o = args[0];
        id = parseInt(args[1] as any, 10);
      }

      // Update the values of the specified sounds
      const ids = self._getSoundIds(id);
      for (let i = 0; i < ids.length; i++) {
        sound = self._soundById(ids[i]) as any;

        if (sound) {
          // Merge the new values into the sound
          const pa = sound._pannerAttr;
          sound._pannerAttr = {
            coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
            coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
            coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
            distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
            maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
            refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
            rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
            panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel,
          };

          // Create a new panner node if one doesn't already exist
          let panner = sound._panner;
          if (!panner) {
            // Make sure we have a position to setup the node with
            if (!sound._pos) {
              sound._pos = self._pos || [0, 0, -0.5];
            }

            // Create a new panner node
            setupPanner(sound, 'spatial');
            panner = sound._panner;
          }

          // Update the panner values
          if (panner instanceof PannerNode) {
            panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
            panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
            panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
            panner.distanceModel = sound._pannerAttr.distanceModel;
            panner.maxDistance = sound._pannerAttr.maxDistance;
            panner.refDistance = sound._pannerAttr.refDistance;
            panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
            panner.panningModel = sound._pannerAttr.panningModel;
          }
        }
      }

      return self;
    };
  }

  /**
   * Extend Sound instances with spatial audio properties
   */
  private onSoundCreate(sound: Sound, parent: Howl): void {
    const spatialParent = parent as any;
    const spatialSound = sound as any;

    // Setup user-defined default properties
    spatialSound._orientation = spatialParent._orientation;
    spatialSound._stereo = spatialParent._stereo;
    spatialSound._pos = spatialParent._pos;
    spatialSound._pannerAttr = spatialParent._pannerAttr;

    // Wrap the reset method to handle spatial cleanup
    if (!spatialSound._originalReset) {
      spatialSound._originalReset = spatialSound.reset.bind(spatialSound);
      spatialSound.reset = function () {
        const self = this as any;
        const parent = self._parent as any;

        // Reset all spatial plugin properties on this sound
        self._orientation = parent._orientation;
        self._stereo = parent._stereo;
        self._pos = parent._pos;
        self._pannerAttr = parent._pannerAttr;

        // If a stereo or position was specified, set it up
        if (self._stereo !== null && self._stereo !== undefined) {
          parent.stereo(self._stereo, self._id);
        } else if (self._pos) {
          parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
        } else if (self._panner) {
          // Disconnect the panner
          self._panner.disconnect(0);
          self._panner = undefined;
          parent._refreshBuffer(self);
        }

        // Complete resetting of the sound
        return self._originalReset();
      };
    }

    // If a stereo or position was specified, set it up
    if (spatialSound._stereo !== null && spatialSound._stereo !== undefined) {
      spatialParent.stereo(spatialSound._stereo, spatialSound._id);
    } else if (spatialSound._pos) {
      spatialParent.pos(spatialSound._pos[0], spatialSound._pos[1], spatialSound._pos[2], spatialSound._id);
    }
  }

  /**
   * Handle load queue for spatial audio
   */
  private onHowlLoad(howl: Howl): void {
    const spatial = howl as any;
    
    // Process any queued spatial audio actions
    if (spatial._queue) {
      for (let i = 0; i < spatial._queue.length; i++) {
        const task = spatial._queue[i];
        if (task.event === 'stereo' || task.event === 'pos' || task.event === 'orientation') {
          task.action();
        }
      }
    }
  }

  onUnregister(): void {
    const howler = globalPluginManager.getHowlerInstance();
    if (!howler) {
      return;
    }

    // Clean up Howler instance
    delete (howler as any)._pos;
    delete (howler as any)._orientation;
    delete (howler as any).pos;
    delete (howler as any).orientation;
    delete (howler as any).stereo;

    // Clean up all Howl instances
    for (let i = 0; i < howler._howls.length; i++) {
      const howl = howler._howls[i] as any;

      // Remove spatial methods from Howl
      delete howl.stereo;
      delete howl.pos;
      delete howl.orientation;
      delete howl.pannerAttr;

      // Remove spatial properties from Howl
      delete howl._pos;
      delete howl._orientation;
      delete howl._stereo;
      delete howl._pannerAttr;
      delete howl._onstereo;
      delete howl._onpos;
      delete howl._onorientation;

      // Clean up all Sound instances in this Howl
      if (howl._sounds) {
        for (let j = 0; j < howl._sounds.length; j++) {
          const sound = howl._sounds[j] as any;

          // Disconnect and remove panner nodes
          if (sound._panner) {
            const wasPlaying = !sound._paused;
            
            try {
              // Disconnect panner from the audio graph
              sound._panner.disconnect(0);
            } catch (e) {
              // Panner may already be disconnected
            }
            
            // Remove panner reference
            sound._panner = undefined;

            // If the sound was playing, we need to stop it and clean up the buffer source
            // The user will need to call play() again to resume without spatial audio
            if (wasPlaying && howl._webAudio && sound._node && sound._node.bufferSource) {
              try {
                // Stop the current buffer source
                if (typeof (sound._node.bufferSource as any).stop === 'undefined') {
                  (sound._node.bufferSource as any).noteOff(0);
                } else {
                  (sound._node.bufferSource as any).stop(0);
                }
                sound._node.bufferSource.disconnect(0);
              } catch (e) {
                // Buffer source may already be stopped or disconnected
              }
              
              // Mark as paused so the audio graph can be reconnected on next play
              sound._paused = true;
              
              // Clean up the buffer source - it will be recreated on next play
              howl._cleanBuffer(sound._node);
            }
          }

          // Remove spatial properties from Sound
          delete sound._pos;
          delete sound._orientation;
          delete sound._stereo;
          delete sound._pannerAttr;

          // Restore original reset method if it was wrapped
          if (sound._originalReset) {
            sound.reset = sound._originalReset;
            delete sound._originalReset;
          }
        }
      }

      // Remove spatial-related queue items
      if (howl._queue) {
        howl._queue = howl._queue.filter((item: any) => {
          return item.event !== 'stereo' && item.event !== 'pos' && item.event !== 'orientation';
        });
      }
    }
  }
}
