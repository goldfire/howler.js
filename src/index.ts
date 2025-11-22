/**
 * Howler.js - Javascript Audio Library
 * Main entry point for the library
 */

// Core library exports
export { Howl, Howler, Sound } from './howler.core';
export type { HowlOptions } from './types';

// Plugin system exports
export { globalPluginManager, HowlerPlugin, PluginManager } from './plugins';
export type { PluginHooks } from './plugins';
