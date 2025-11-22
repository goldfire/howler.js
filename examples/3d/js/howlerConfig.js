/*!
 *  Howler.js 3D Sound Demo - Configuration
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howl, Howler } from 'howler';
import { SpatialAudioPlugin } from 'howler/plugins/spatial';

const spatialAudioPlugin = new SpatialAudioPlugin();
// Register the spatial audio plugin on module initialization
Howler.addPlugin(spatialAudioPlugin);

/**
 * Pre-configured Howler instance with spatial audio capabilities
 * @type {import('howler/plugins/spatial').SpatialHowler}
 */
export { Howler };

/**
 * Howl constructor for creating sound instances with spatial audio support
 * @type {new (...args: any[]) => import('howler/plugins/spatial').SpatialHowl}
 */
export { Howl };

