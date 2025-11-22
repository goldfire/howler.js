/*!
 *  Lightweight User Agent Parser for Howler.js
 *  Provides simple browser/device detection utilities
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

/**
 * Get the user agent string from navigator
 */
function getUserAgent(navigator: Navigator | null): string {
  return navigator?.userAgent || '';
}

/**
 * Get the platform string from navigator
 */
function getPlatform(navigator: Navigator | null): string {
  return navigator?.platform || '';
}

/**
 * Check if the device is iOS (iPhone, iPad, iPod)
 */
export function isIOS(navigator: Navigator | null): boolean {
  return /iP(hone|od|ad)/.test(getPlatform(navigator));
}

/**
 * Get iOS version from appVersion
 * Returns the major version number or null if not iOS or version can't be determined
 */
export function getIOSVersion(navigator: Navigator | null): number | null {
  if (!isIOS(navigator)) {
    return null;
  }

  const appVersion = navigator?.appVersion?.match(/OS (\d+)_(\d+)_?(\d+)?/);
  return appVersion ? parseInt(appVersion[1], 10) : null;
}

/**
 * Check if the browser is Safari (not Chrome-based)
 */
export function isSafari(navigator: Navigator | null): boolean {
  const ua = getUserAgent(navigator);
  return ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1;
}

/**
 * Get Safari version from user agent
 * Returns the major version number or null if not Safari or version can't be determined
 */
export function getSafariVersion(navigator: Navigator | null): number | null {
  if (!isSafari(navigator)) {
    return null;
  }

  const ua = getUserAgent(navigator);
  const versionMatch = ua.match(/Version\/(.*?) /);
  return versionMatch ? parseInt(versionMatch[1], 10) : null;
}

/**
 * Check if Safari is an old version (before version 15)
 */
export function isOldSafari(navigator: Navigator | null): boolean {
  const version = getSafariVersion(navigator);
  return version !== null && version < 15;
}

/**
 * Check if the browser is Opera
 */
export function isOpera(navigator: Navigator | null): boolean {
  const ua = getUserAgent(navigator);
  return /OPR\//.test(ua);
}

/**
 * Get Opera version from user agent
 * Returns the major version number or null if not Opera or version can't be determined
 */
export function getOperaVersion(navigator: Navigator | null): number | null {
  if (!isOpera(navigator)) {
    return null;
  }

  const ua = getUserAgent(navigator);
  const versionMatch = ua.match(/OPR\/(\d+)/);
  return versionMatch ? parseInt(versionMatch[1], 10) : null;
}

/**
 * Check if Opera is an old version (before version 33)
 */
export function isOldOpera(navigator: Navigator | null): boolean {
  const version = getOperaVersion(navigator);
  return version !== null && version < 33;
}

/**
 * Check if the browser is Internet Explorer (MSIE or Trident)
 */
export function isIE(navigator: Navigator | null): boolean {
  const ua = getUserAgent(navigator);
  return /MSIE |Trident\//.test(ua);
}

/**
 * Check if the browser vendor is Apple
 */
export function isAppleVendor(navigator: Navigator | null): boolean {
  return (navigator?.vendor?.indexOf('Apple') ?? -1) >= 0;
}

/**
 * Check if the browser is Chrome-based (Chrome, Edge, etc.)
 */
export function isChromeBased(navigator: Navigator | null): boolean {
  const ua = getUserAgent(navigator);
  return ua.indexOf('Chrome') !== -1;
}

/**
 * Check if the browser is CocoonJS (for game engines)
 */
export function isCocoonJS(navigator: Navigator | null): boolean {
  return !!(navigator as any)?.isCocoonJS;
}

