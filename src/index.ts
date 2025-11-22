/**
 * Howler.js - Javascript Audio Library
 * Main entry point for the library
 */

// Core library exports
export { Howler, Howl, Sound } from './howler.core';
export type { HowlOptions } from './types';

// Plugin system exports
export { PluginManager, HowlerPlugin, globalPluginManager } from './plugins';
export type { PluginHooks } from './plugins';
