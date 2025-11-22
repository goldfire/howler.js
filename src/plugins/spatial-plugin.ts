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
import { Howl, HowlerGlobal } from '../howler.core';
import { HowlerPlugin, type PluginHooks, globalPluginManager } from './plugin';

/**
 * Spatial audio properties
 */
export interface SpatialAudioState {
  _pos: [number, number, number];
  _orientation: [number, number, number, number, number, number];
  _stereo?: number;
}

/**
 * Howler instance with spatial audio capabilities
 */
export type SpatialHowler = HowlerGlobal & SpatialAudioState & {
  pos(x?: number, y?: number, z?: number): any;
  orientation(x?: number, y?: number, z?: number, xUp?: number, yUp?: number, zUp?: number): any;
  stereo(pan?: number): any;
};

/**
 * Howl instance with spatial audio capabilities
 */
export type SpatialHowl = Howl & {
  _pos?: [number, number, number] | null;
  _orientation?: [number, number, number];
  _stereo?: number | null;
  _pannerAttr?: any;
  pos(x?: number, y?: number, z?: number, id?: number): any;
  orientation(x?: number, y?: number, z?: number, id?: number): any;
  stereo(pan?: number, id?: number): any;
  pannerAttr(o?: any, id?: number): any;
};

/**
 * Mixin function to add spatial audio to HowlerGlobal (listener)
 */
export function withSpatialListener<T extends HowlerGlobal>(
  instance: T
): T & SpatialAudioState & {
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
      console.warn('Spatial audio unavailable: Web Audio API not supported');
      return this;
    }

    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : spatial._pos[1];
      const z_val = typeof z === 'number' ? z : spatial._pos[2];
      spatial._pos = [x, y_val, z_val];

      // Set listener position using appropriate API
      if (typeof this.ctx.listener.positionX !== 'undefined') {
        this.ctx.listener.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.1);
        this.ctx.listener.positionY.setTargetAtTime(y_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.positionZ.setTargetAtTime(z_val, this.ctx.currentTime, 0.1);
      } else {
        (this.ctx.listener as any).setPosition(x, y_val, z_val);
      }

      return this;
    }

    return spatial._pos;
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
      console.warn('Spatial audio unavailable: Web Audio API not supported');
      return this;
    }

    if (typeof x === 'number') {
      const or = spatial._orientation;
      const y_val = typeof y === 'number' ? y : or[1];
      const z_val = typeof z === 'number' ? z : or[2];
      const xUp_val = typeof xUp === 'number' ? xUp : or[3];
      const yUp_val = typeof yUp === 'number' ? yUp : or[4];
      const zUp_val = typeof zUp === 'number' ? zUp : or[5];
      spatial._orientation = [x, y_val, z_val, xUp_val, yUp_val, zUp_val];

      // Set listener orientation using appropriate API
      if (typeof this.ctx.listener.forwardX !== 'undefined') {
        this.ctx.listener.forwardX.setTargetAtTime(x, this.ctx.currentTime, 0.1);
        this.ctx.listener.forwardY.setTargetAtTime(y_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.forwardZ.setTargetAtTime(z_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upX.setTargetAtTime(xUp_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upY.setTargetAtTime(yUp_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upZ.setTargetAtTime(zUp_val, this.ctx.currentTime, 0.1);
      } else {
        (this.ctx.listener as any).setOrientation(
          x,
          y_val,
          z_val,
          xUp_val,
          yUp_val,
          zUp_val
        );
      }

      return this;
    }

    return spatial._orientation;
  };

  // Add stereo method
  spatial.stereo = function (pan?: number) {
    if (!this.ctx || !this.ctx.listener) {
      console.warn('Spatial audio unavailable: Web Audio API not supported');
      return this;
    }

    if (typeof pan === 'number') {
      for (let i = 0; i < this._howls.length; i++) {
        (this._howls[i] as any).stereo?.(pan);
      }
      return this;
    }

    return spatial._stereo ?? 0;
  };

  return spatial;
}

/**
 * Mixin function to add spatial audio to Howl instances
 */
export function withSpatialHowl<T extends Howl>(
  instance: T
): T & {
  _orientation: [number, number, number];
  _stereo: number | null;
  _pos: [number, number, number] | null;
  _pannerAttr: any;
  pos(x?: number, y?: number, z?: number, id?: number): any;
  orientation(x?: number, y?: number, z?: number, id?: number): any;
  stereo(pan?: number, id?: number): any;
  pannerAttr(o?: any, id?: number): any;
} {
  const spatial = instance as any;

  spatial._orientation = [1, 0, 0];
  spatial._stereo = null;
  spatial._pos = null;
  spatial._pannerAttr = {
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0,
    distanceModel: 'inverse',
    maxDistance: 10000,
    refDistance: 1,
    rolloffFactor: 1,
    panningModel: 'HRTF',
  };

  spatial.stereo = function (pan?: number, id?: number) {
    if (typeof pan === 'number') {
      spatial._stereo = pan;
      return this;
    }
    return spatial._stereo ?? 0;
  };

  spatial.pos = function (x?: number, y?: number, z?: number, id?: number) {
    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : (spatial._pos?.[1] ?? 0);
      const z_val = typeof z === 'number' ? z : (spatial._pos?.[2] ?? 0);
      spatial._pos = [x, y_val, z_val];
      return this;
    }
    return spatial._pos ?? [0, 0, 0];
  };

  spatial.orientation = function (x?: number, y?: number, z?: number, id?: number) {
    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : spatial._orientation[1];
      const z_val = typeof z === 'number' ? z : spatial._orientation[2];
      spatial._orientation = [x, y_val, z_val];
      return this;
    }
    return spatial._orientation;
  };

  spatial.pannerAttr = function (o?: any, id?: number) {
    if (o) {
      Object.assign(spatial._pannerAttr, o);
      return this;
    }
    return spatial._pannerAttr;
  };

  return spatial;
}

/**
 * Spatial Audio Plugin
 * Adds 3D spatial audio and stereo panning capabilities to Howler and Howl instances
 *
 * Usage:
 * ```typescript
 * import { Howler } from 'howler';
 * import { SpatialAudioPlugin } from 'howler/plugins/spatial';
 *
 * // Register the plugin
 * Howler.addPlugin(new SpatialAudioPlugin());
 *
 * // Use spatial methods on Howler listener:
 * Howler.pos(10, 20, 30);
 * Howler.orientation(1, 0, 0, 0, 1, 0);
 *
 * // Use spatial methods on Howl instances:
 * const sound = new Howl({ src: 'audio.mp3' });
 * sound.pos(10, 20, 30);
 * sound.stereo(0.5);
 * sound.pannerAttr({ refDistance: 0.8 });
 * ```
 */
export class SpatialAudioPlugin extends HowlerPlugin {
  readonly name = 'spatial-audio';
  readonly version = '1.0.0';

  getHooks(): PluginHooks {
    return {
      onRegister: this.onRegister.bind(this),
      onHowlCreate: this.onHowlCreate.bind(this),
    };
  }

  /**
   * Initialize spatial audio when the plugin is registered.
   * This is called whether the Howler is already initialized or not.
   */
  private onRegister(): void {
    // Apply the spatial audio mixin to Howler if it's initialized
    const howler = globalPluginManager.getHowlerInstance();
    if (howler) {
      withSpatialListener(howler);
    }
  }

  /**
   * Extend Howl instances with spatial audio methods via mixin.
   */
  private onHowlCreate(howl: Howl, _options: HowlOptions): void {
    withSpatialHowl(howl);
  }

  onUnregister(): void {
    // Remove spatial audio methods from Howler instance
    const howler = globalPluginManager.getHowlerInstance();
    if (howler) {
      // Remove spatial audio properties and methods
      delete (howler as any)._pos;
      delete (howler as any)._orientation;
      delete (howler as any)._stereo;
      delete (howler as any).pos;
      delete (howler as any).orientation;
      delete (howler as any).stereo;
    }
  }
}
