/**
 * Howler.js - Spatial Plugin Entry Point
 */

// Export spatial types for TypeScript support
export type {
	SpatialAudioState,
	SpatialHowl,
	SpatialHowler,
	SpatialHowlOptions,
	SpatialHowlState,
	SpatialSoundState,
} from "./spatial-plugin";
// Export the plugin for use with Howler.addPlugin()
export { SpatialAudioPlugin } from "./spatial-plugin";
