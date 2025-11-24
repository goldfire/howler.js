/**
 * Howler.js - Spatial Plugin Entry Point
 *
 * This module exports the spatial audio plugin and all related types for TypeScript support.
 *
 * @example
 * ```typescript
 * import { Howler } from 'howler';
 * import { SpatialAudioPlugin, type SpatialHowler, type SpatialHowl } from 'howler/plugins/spatial';
 *
 * // Register the plugin
 * Howler.addPlugin(new SpatialAudioPlugin());
 *
 * // Use typed Howler instance
 * const howler: SpatialHowler = Howler as SpatialHowler;
 * howler.pos(10, 20, 30);
 * ```
 */

/**
 * Type exports for spatial audio functionality.
 * Import these types when using the spatial plugin for full TypeScript support.
 */
export type {
	/** Spatial audio state for the global Howler instance. */
	SpatialAudioState,
	/** Howl instance with spatial audio capabilities. */
	SpatialHowl,
	/** Howler instance with spatial audio capabilities. */
	SpatialHowler,
	/** Extended HowlOptions with spatial audio properties. */
	SpatialHowlOptions,
	/** Spatial audio state for a Howl instance. */
	SpatialHowlState,
	/** Spatial audio state for a Sound instance. */
	SpatialSoundState
} from "./spatial-plugin";
/**
 * Spatial audio plugin for Howler.js.
 * Adds 3D spatial audio and stereo panning capabilities.
 */
export { SpatialAudioPlugin } from "./spatial-plugin";
