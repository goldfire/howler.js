/*!
 *  Howler.js Type Definitions
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

/**
 * Configuration options for creating a new Howl instance.
 *
 * @example
 * ```typescript
 * const sound = new Howl({
 *   src: ['sound.mp3', 'sound.ogg'],
 *   volume: 0.5,
 *   autoplay: true,
 *   onload: () => console.log('Sound loaded')
 * });
 * ```
 */
export interface HowlOptions {
	/** Source file(s) for the audio. Can be a string or array of strings for multiple formats. */
	src: string | string[];
	/** Automatically start playback when ready. Default: `false` */
	autoplay?: boolean;
	/** Format(s) of the audio file(s). If not specified, will be extracted from the src URL. */
	format?: string | string[];
	/** Force HTML5 Audio. This should be used for large audio files so that you don't have to wait for the full file to be downloaded and decoded before playing. Default: `false` */
	html5?: boolean;
	/** Set to true to mute the sound. Default: `false` */
	mute?: boolean;
	/** Set to true to automatically loop the sound. Default: `false` */
	loop?: boolean;
	/** The size of the inactive sounds pool. Default: `5` */
	pool?: number;
	/** Automatically begin downloading the audio file when the Howl is initialized. If using HTML5 Audio, you can set this to 'metadata' to only preload the metadata. Default: `true` */
	preload?: boolean | "metadata";
	/** The rate of playback. 0.5 to 4.0, with 1.0 being normal speed. Default: `1.0` */
	rate?: number;
	/** Define a sprite map of sections within the audio file. */
	sprite?: Record<string, [number, number, boolean?]>;
	/** The volume of the sound, from 0.0 to 1.0. Default: `1.0` */
	volume?: number;
	/** Configure fetch options for loading audio files (when using Web Audio). */
	xhr?: {
		/** The HTTP method to use. Default: `'GET'` */
		method?: string;
		/** Custom headers to send with the request. */
		headers?: Record<string, string>;
		/** Whether to send credentials with the request. Default: `false` */
		withCredentials?: boolean;
	};
	/** Fires when the sound finishes playing. */
	onend?: () => void;
	/** Fires when the sound has been faded in/out. */
	onfade?: () => void;
	/** Fires when the sound has been loaded. */
	onload?: () => void;
	/** Fires when the sound is unable to load. */
	onloaderror?: (id: number, msg: string) => void;
	/** Fires when the sound is unable to play. */
	onplayerror?: (id: number, msg: string) => void;
	/** Fires when the sound has been paused. */
	onpause?: () => void;
	/** Fires when the sound begins playing. */
	onplay?: () => void;
	/** Fires when the sound has been stopped. */
	onstop?: () => void;
	/** Fires when the sound has been muted/unmuted. */
	onmute?: () => void;
	/** Fires when the sound's volume has changed. */
	onvolume?: () => void;
	/** Fires when the sound's playback rate has changed. */
	onrate?: () => void;
	/** Fires when the sound's current position has changed. */
	onseek?: () => void;
	/** Fires when the audio has been unlocked (required for some browsers on mobile). */
	onunlock?: () => void;
}

/**
 * Event listener configuration for Howl events.
 *
 * @internal
 */
export interface EventListener {
	/** Optional sound ID to scope the event to a specific sound instance. */
	id?: number;
	/** The callback function to execute when the event fires. */
	fn: (...args: unknown[]) => void;
	/** If true, the listener will be removed after the first execution. */
	once?: boolean;
}

/**
 * Queue item for deferred actions when a sound is not yet loaded.
 *
 * @internal
 */
export interface QueueItem {
	/** The event name that triggers this action. */
	event: string;
	/** The action to execute when the event fires. */
	action: () => void;
}

/**
 * Global cache for decoded audio buffers.
 * This allows multiple Howl instances to share the same audio data.
 *
 * @internal
 */
export const cache: Record<string, AudioBuffer> = {};

/**
 * Extended HTMLAudioElement with custom properties used by Howler.
 *
 * @internal
 */
export interface HTMLAudioElementWithUnlocked extends HTMLAudioElement {
	/** Internal flag indicating if the audio element has been unlocked for playback. */
	_unlocked?: boolean;
}

/**
 * Extended AudioBufferSourceNode with optional loop properties.
 * Used for Web Audio API compatibility.
 *
 * @internal
 */
export interface AudioBufferSourceNodeWithLegacy
	extends Omit<AudioBufferSourceNode, "loop" | "loopEnd" | "loopStart"> {
	/** Whether the audio should loop. */
	loop?: boolean;
	/** The start time of the loop in seconds. */
	loopStart?: number | undefined;
	/** The end time of the loop in seconds. */
	loopEnd?: number | undefined;
}

/**
 * Extended Window interface with Audio constructor.
 *
 * @internal
 */
export interface WindowWithAudio extends Window {
	/** Audio constructor for creating HTML5 audio elements. */
	Audio: {
		new (): HTMLAudioElement;
	};
}

/**
 * Navigator interface (no extensions needed for target browsers).
 *
 * @internal
 */
export interface NavigatorWithCocoonJS extends Navigator {}

/**
 * Extended GainNode with bufferSource property for Web Audio API usage.
 *
 * @internal
 */
export interface GainNodeWithBufferSource extends GainNode {
	/** The AudioBufferSourceNode connected to this gain node. */
	bufferSource?: AudioBufferSourceNodeWithLegacy;
}

/**
 * Type guard to check if a node is an HTMLAudioElement.
 * This specifically excludes HTMLVideoElement by checking for the absence of videoWidth.
 *
 * @param node - The node to check
 * @returns True if the node is an HTMLAudioElement
 *
 * @example
 * ```typescript
 * if (isHTMLAudioElement(node)) {
 *   node.volume = 0.5;
 * }
 * ```
 */
export function isHTMLAudioElement(
	node: HTMLAudioElementWithUnlocked | GainNodeWithBufferSource | null,
): node is HTMLAudioElementWithUnlocked {
	return (
		node !== null &&
		node instanceof HTMLAudioElement &&
		"src" in node &&
		"play" in node &&
		!("videoWidth" in node)
	);
}

/**
 * Type guard to check if a node is a GainNode.
 *
 * @param node - The node to check
 * @returns True if the node is a GainNode
 *
 * @example
 * ```typescript
 * if (isGainNode(node)) {
 *   node.gain.value = 0.5;
 * }
 * ```
 */
export function isGainNode(
	node: HTMLAudioElementWithUnlocked | GainNodeWithBufferSource | null,
): node is GainNodeWithBufferSource {
	return node !== null && "gain" in node && "connect" in node;
}
