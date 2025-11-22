/*!
 *  Howler.js Plugin System
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import type { Howl, HowlerGlobal, Sound } from '../howler.core';
import type { HowlOptions } from '../types';

/**
 * Plugin hook lifecycle events
 */
export interface PluginHooks {
  /**
   * Called when the plugin is registered with the PluginManager
   */
  onRegister?: () => void;

  /**
   * Called when Howler global instance is initialized
   */
  onHowlerInit?: (howler: HowlerGlobal) => void;

  /**
   * Called when a new Howl instance is created
   */
  onHowlCreate?: (howl: Howl, options: HowlOptions) => void;

  /**
   * Called when a Sound instance is created
   */
  onSoundCreate?: (sound: Sound, parent: Howl) => void;

  /**
   * Called when a Howl instance is loaded
   */
  onHowlLoad?: (howl: Howl) => void;

  /**
   * Called when a Howl instance is destroyed
   */
  onHowlDestroy?: (howl: Howl) => void;
}

/**
 * Base plugin class
 * Extend this class to create a custom Howler plugin
 */
export abstract class HowlerPlugin {
  /**
   * Unique plugin name (must be unique across all plugins)
   */
  abstract readonly name: string;

  /**
   * Plugin version (optional)
   */
  readonly version?: string;

  /**
   * Get the hooks provided by this plugin
   */
  abstract getHooks(): PluginHooks;

  /**
   * Called when plugin is about to be unregistered
   * Use this to clean up resources
   */
  onUnregister?(): void;
}

/**
 * Plugin registration metadata
 */
export interface RegisteredPlugin {
  plugin: HowlerPlugin;
  hooks: PluginHooks;
}

/**
 * Plugin manager for registering and executing plugins
 */
export class PluginManager {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private howlerInstance: HowlerGlobal | null = null;

  /**
   * Register a plugin
   * @param plugin - The plugin to register
   * @throws Error if plugin name already exists
   */
  register(plugin: HowlerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    const hooks = plugin.getHooks();
    const registered: RegisteredPlugin = {
      plugin,
      hooks
    };

    this.plugins.set(plugin.name, registered);

    // Execute onRegister hook if provided
    // Plugins can use this hook to initialize themselves, even if Howler is
    // already initialized. The howlerInstance is available via getHowlerInstance()
    if (hooks.onRegister) {
      try {
        hooks.onRegister();
      } catch (error: unknown) {
        console.error(`Error during onRegister for plugin "${plugin.name}":`, error);
      }
    }

    // If Howler is already initialized, execute onHowlerInit hook for this plugin
    if (this.howlerInstance && hooks.onHowlerInit) {
      try {
        hooks.onHowlerInit(this.howlerInstance);
      } catch (error: unknown) {
        console.error(`Error during onHowlerInit for plugin "${plugin.name}":`, error);
      }
    }
  }

  /**
   * Unregister a plugin
   * @param pluginName - The name of the plugin to unregister
   */
  unregister(pluginName: string): void {
    const registered = this.plugins.get(pluginName);
    if (!registered) {
      throw new Error(`Plugin "${pluginName}" is not registered`);
    }

    // Call cleanup hook
    if (registered.plugin.onUnregister) {
      try {
        registered.plugin.onUnregister();
      } catch (error) {
        console.error(`Error during onUnregister for plugin "${pluginName}":`, error);
      }
    }

    this.plugins.delete(pluginName);
  }

  /**
   * Check if a plugin is registered
   * @param pluginName - The name of the plugin
   */
  isRegistered(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Set the Howler instance reference for late-registered plugins
   * Also executes onHowlerInit hooks for any plugins already registered
   * @internal
   */
  setHowlerInstance(howler: HowlerGlobal): void {
    this.howlerInstance = howler;
    
    // Execute onHowlerInit hooks for all registered plugins
    this._executeHooks('onHowlerInit', (hooks) => {
      if (hooks.onHowlerInit) {
        hooks.onHowlerInit(howler);
      }
    });
  }

  /**
   * Get the Howler instance (if initialized)
   * This can be used by plugins in their onRegister hook to apply initialization
   */
  getHowlerInstance(): HowlerGlobal | null {
    return this.howlerInstance;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ReadonlyMap<string, RegisteredPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Execute onHowlCreate hooks
   */
  executeHowlCreate(howl: Howl, options: HowlOptions): void {
    this._executeHooks('onHowlCreate', (hooks) => {
      if (hooks.onHowlCreate) {
        hooks.onHowlCreate(howl, options);
      }
    });
  }

  /**
   * Execute onSoundCreate hooks
   */
  executeSoundCreate(sound: Sound, parent: Howl): void {
    this._executeHooks('onSoundCreate', (hooks) => {
      if (hooks.onSoundCreate) {
        hooks.onSoundCreate(sound, parent);
      }
    });
  }

  /**
   * Execute onHowlLoad hooks
   */
  executeHowlLoad(howl: Howl): void {
    this._executeHooks('onHowlLoad', (hooks) => {
      if (hooks.onHowlLoad) {
        hooks.onHowlLoad(howl);
      }
    });
  }

  /**
   * Execute onHowlDestroy hooks
   */
  executeHowlDestroy(howl: Howl): void {
    this._executeHooks('onHowlDestroy', (hooks) => {
      if (hooks.onHowlDestroy) {
        hooks.onHowlDestroy(howl);
      }
    });
  }

  /**
   * Internal hook execution with error handling
   */
  private _executeHooks(hookName: string, callback: (hooks: PluginHooks) => void): void {
    for (const [pluginName, registered] of this.plugins) {
      try {
        callback(registered.hooks);
      } catch (error) {
        console.error(`Error in hook "${hookName}" for plugin "${pluginName}":`, error);
      }
    }
  }
}

/**
 * Global plugin manager instance
 */
export const globalPluginManager = new PluginManager();
