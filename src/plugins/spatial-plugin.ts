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

import { HowlerPlugin, type PluginHooks } from './plugin';
import { Howl, HowlerGlobal, Sound } from '../howler.core';
import type { HowlOptions } from '../howler.core';

/**
 * Extended Howler class with spatial audio support
 */
export class SpatialHowler extends (HowlerGlobal as any) {
  _pos: [number, number, number] = [0, 0, 0];
  _orientation: [number, number, number, number, number, number] = [0, 0, -1, 0, 1, 0];

  stereo(pan?: number): this | number {
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

    return (this as any)._stereo ?? 0;
  }

  pos(x?: number, y?: number, z?: number): this | [number, number, number] {
    if (!this.ctx || !this.ctx.listener) {
      console.warn('Spatial audio unavailable: Web Audio API not supported');
      return this;
    }

    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : this._pos[1];
      const z_val = typeof z === 'number' ? z : this._pos[2];
      this._pos = [x, y_val, z_val];

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

    return this._pos;
  }

  orientation(
    x?: number,
    y?: number,
    z?: number,
    xUp?: number,
    yUp?: number,
    zUp?: number
  ): this | [number, number, number, number, number, number] {
    if (!this.ctx || !this.ctx.listener) {
      console.warn('Spatial audio unavailable: Web Audio API not supported');
      return this;
    }

    if (typeof x === 'number') {
      const or = this._orientation;
      const y_val = typeof y === 'number' ? y : or[1];
      const z_val = typeof z === 'number' ? z : or[2];
      const xUp_val = typeof xUp === 'number' ? xUp : or[3];
      const yUp_val = typeof yUp === 'number' ? yUp : or[4];
      const zUp_val = typeof zUp === 'number' ? zUp : or[5];
      this._orientation = [x, y_val, z_val, xUp_val, yUp_val, zUp_val];

      // Set listener orientation using appropriate API
      if (typeof this.ctx.listener.forwardX !== 'undefined') {
        this.ctx.listener.forwardX.setTargetAtTime(x, this.ctx.currentTime, 0.1);
        this.ctx.listener.forwardY.setTargetAtTime(y_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.forwardZ.setTargetAtTime(z_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upX.setTargetAtTime(xUp_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upY.setTargetAtTime(yUp_val, this.ctx.currentTime, 0.1);
        this.ctx.listener.upZ.setTargetAtTime(zUp_val, this.ctx.currentTime, 0.1);
      } else {
        (this.ctx.listener as any).setOrientation(x, y_val, z_val, xUp_val, yUp_val, zUp_val);
      }

      return this;
    }

    return this._orientation;
  }
}

/**
 * Extended Howl class with spatial audio support
 */
export class SpatialHowl extends Howl {
  _orientation: [number, number, number] = [1, 0, 0];
  _stereo: number | null = null;
  _pos: [number, number, number] | null = null;
  _pannerAttr: {
    coneInnerAngle: number;
    coneOuterAngle: number;
    coneOuterGain: number;
    distanceModel: string;
    maxDistance: number;
    refDistance: number;
    rolloffFactor: number;
    panningModel: string;
  } = {
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0,
    distanceModel: 'inverse',
    maxDistance: 10000,
    refDistance: 1,
    rolloffFactor: 1,
    panningModel: 'HRTF',
  };

  constructor(o: HowlOptions & any) {
    super(o);
    // Initialize spatial properties from options
    this._orientation = o.orientation || [1, 0, 0];
    this._stereo = o.stereo || null;
    this._pos = o.pos || null;
    this._pannerAttr = {
      coneInnerAngle: o.coneInnerAngle ?? 360,
      coneOuterAngle: o.coneOuterAngle ?? 360,
      coneOuterGain: o.coneOuterGain ?? 0,
      distanceModel: o.distanceModel ?? 'inverse',
      maxDistance: o.maxDistance ?? 10000,
      refDistance: o.refDistance ?? 1,
      rolloffFactor: o.rolloffFactor ?? 1,
      panningModel: o.panningModel ?? 'HRTF',
    };
  }

  stereo(pan?: number, id?: number): this | number {
    if (typeof pan === 'number') {
      this._stereo = pan;
      // Apply to all sounds
      for (let i = 0; i < this._sounds.length; i++) {
        (this._sounds[i] as any)._stereo = pan;
      }
      return this;
    }
    return this._stereo ?? 0;
  }

  pos(x?: number, y?: number, z?: number, id?: number): this | [number, number, number] {
    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : (this._pos?.[1] ?? 0);
      const z_val = typeof z === 'number' ? z : (this._pos?.[2] ?? 0);
      this._pos = [x, y_val, z_val];
      return this;
    }
    return this._pos ?? [0, 0, 0];
  }

  orientation(x?: number, y?: number, z?: number, id?: number): this | [number, number, number] {
    if (typeof x === 'number') {
      const y_val = typeof y === 'number' ? y : this._orientation[1];
      const z_val = typeof z === 'number' ? z : this._orientation[2];
      this._orientation = [x, y_val, z_val];
      return this;
    }
    return this._orientation;
  }

  pannerAttr(o?: any, id?: number): any {
    if (o) {
      Object.assign(this._pannerAttr, o);
      return this;
    }
    return this._pannerAttr;
  }
}

/**
 * Extended Sound class with spatial audio support
 */
export class SpatialSound extends Sound {
  _orientation: [number, number, number] = [1, 0, 0];
  _stereo: number | null = null;
  _pos: [number, number, number] | null = null;
  _pannerAttr: {
    coneInnerAngle: number;
    coneOuterAngle: number;
    coneOuterGain: number;
    distanceModel: string;
    maxDistance: number;
    refDistance: number;
    rolloffFactor: number;
    panningModel: string;
  } = {
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0,
    distanceModel: 'inverse',
    maxDistance: 10000,
    refDistance: 1,
    rolloffFactor: 1,
    panningModel: 'HRTF',
  };
  _panner?: PannerNode | StereoPannerNode;

  constructor(howl: Howl) {
    super(howl);
    // Inherit spatial properties from parent
    if (howl instanceof SpatialHowl) {
      this._orientation = howl._orientation;
      this._stereo = howl._stereo;
      this._pos = howl._pos;
      this._pannerAttr = howl._pannerAttr;
    }
  }
}

/**
 * Spatial Audio Plugin
 * Adds 3D spatial audio and stereo panning capabilities to Howler
 *
 * Usage:
 * ```typescript
 * import { globalPluginManager } from 'howler/plugins';
 * import { SpatialAudioPlugin } from 'howler/plugins/spatial';
 *
 * globalPluginManager.register(new SpatialAudioPlugin());
 *
 * // Then use the spatial classes for your audio objects:
 * const sound = new SpatialHowl({ src: 'audio.mp3' });
 * sound.pos(10, 20, 30);
 * sound.stereo(0.5);
 * ```
 */
export class SpatialAudioPlugin extends HowlerPlugin {
  readonly name = 'spatial-audio';
  readonly version = '1.0.0';

  getHooks(): PluginHooks {
    return {
      onHowlerInit: this.onHowlerInit.bind(this),
    };
  }

  /**
   * Initialize spatial audio global state when Howler is initialized.
   * Note: Users should instantiate SpatialHowl and SpatialSound directly
   * instead of using the base Howl and Sound classes when they need spatial features.
   */
  private onHowlerInit(howler: HowlerGlobal): void {
    console.info(
      'Spatial Audio Plugin registered. Use SpatialHowl and SpatialSound classes for spatial audio features.'
    );
  }

  onUnregister(): void {
    // Cleanup if needed
  }
}
