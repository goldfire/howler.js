/**
 * Global cache for decoded audio buffers.
 * This allows multiple Howl instances to share the same audio data.
 *
 * @internal
 */
export const cache: Record<string, AudioBuffer> = {};