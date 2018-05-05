## 2.0.10 (May 5, 2018)
- `FIXED` Fixed another Chrome deprecation warning when using panning methods ([#923](https://github.com/goldfire/howler.js/issues/923)).
- `FIXED` Playback rate wasn't working correctly in Internet Explorer when defined in the `Howl` constructor ([#936](https://github.com/goldfire/howler.js/issues/936)).
- `FIXED` Looped audio would only play twice in Internet Explorer ([#921](https://github.com/goldfire/howler.js/issues/921)).

## 2.0.9 (February 10, 2018)
- `FIXED` More accurate HTML5 Audio `end` timer and fix for Firefox streams ending early ([#883](https://github.com/goldfire/howler.js/issues/883)).
- `FIXED` Prevent `play` events from duplicating in certain instances ([#899](https://github.com/goldfire/howler.js/issues/899)).
- `FIXED` Add second parameter to HTML5 Audio playback promise to fix Safari error ([#896](https://github.com/goldfire/howler.js/pull/896)).
- `FIXED` Refactored the internal queue system to fix various edge cases.

## 2.0.8 (January 19, 2018)
- `CHANGED` Fades now use elapsed time to be more accurate when intervals are inconsistent ([#885](https://github.com/goldfire/howler.js/issues/885)).
- `CHANGED` Improve timing of short fades ([#884](https://github.com/goldfire/howler.js/issues/884)).
- `FIXED` Fixed another Chrome deprecation when setting playback rate.
- `FIXED` Prevent `onplay` from firing when first setting `stereo` value ([#843](https://github.com/goldfire/howler.js/issues/843)).

## 2.0.7 (December 18, 2017)
- `FIXED` Accidental `const` was included in the previous version.

## 2.0.6 (December 15, 2017)
- `FIXED` Replaced deprecated `gain.value` and `gain.pan.value` with `setValueAtTime` ([#856](https://github.com/goldfire/howler.js/issues/856)).
- `FIXED` Audio sprites weren't ending correctly in Internet Explorer 11 ([#841](https://github.com/goldfire/howler.js/issues/841)).
- `FIXED` Correctly set group volume when fading ([#539](https://github.com/goldfire/howler.js/issues/539)).
- `FIXED` Cancel `fade` on sound when `mute` is called ([#666](https://github.com/goldfire/howler.js/issues/666)).
- `FIXED` Uncaught error when play() request was interrupted by a call to pause() ([#835](https://github.com/goldfire/howler.js/pull/835)).
- `FIXED` Incorrect reference to global `_scratchBuffer` ([#834](https://github.com/goldfire/howler.js/pull/834)).

## 2.0.5 (October 6, 2017)
- `ADDED` Add support for `withCredentials` to Web Audio XHR requests ([#610](https://github.com/goldfire/howler.js/pull/610)).
- `ADDED` Add `playerror` event for when mobile HTML5 audio is unable to play ([#774](https://github.com/goldfire/howler.js/issues/774)).
- `FIXED` Refactor fade method to eliminate bind memory allocations (no change to API).
- `FIXED` Prevent seeking after sound has been unloaded ([#797](https://github.com/goldfire/howler.js/pull/797)).
- `FIXED` Check for `paused` instead of `ended` on HTML5 end check to correctly handle data URI's ([#775](https://github.com/goldfire/howler.js/pull/775)).
- `FIXED` Fix unlocking of mobile audio on iOS when user swipes instead of taps ([#808](https://github.com/goldfire/howler.js/pull/808)).
- `FIXED` `pannerAttr` values can now be set via object as the documentation originally specified.
- `FIXED` Various corrections and improvements to the spatial audio documentation.

## 2.0.4 (June 9, 2017)
- `CHANGED` Removed the `resuming` state, which wasn't actually being used and was leading to a bug on Android ([#679](https://github.com/goldfire/howler.js/pull/679)).
- `CHANGED` Any playback initiated before the sound has loaded will now go into the queue to fix various race conditions ([#714](https://github.com/goldfire/howler.js/pull/714)).
- `FIXED` Correctly initialize an AudioContext with the global mute status ([#714](https://github.com/goldfire/howler.js/pull/714)).
- `FIXED` AudioContext unlocks on user interaction within a cross-domain iframe on Android Chrome ([#756](https://github.com/goldfire/howler.js/pull/756)).
- `FIXED` Stopping/pausing a group of sounds now behaves as expected in edge cases ([#734](https://github.com/goldfire/howler.js/pull/734)).
- `FIXED` Sound ID's now start at 1000 instead of 0 to avoid `rate` collisions ([#764](https://github.com/goldfire/howler.js/issues/764)).
- `FIXED` Prevent unknown mime errors on Internet Explorer when unloading a sound ([#720](https://github.com/goldfire/howler.js/pull/720)).
- `FIXED` Correctly clean up error event listeners ([#720](https://github.com/goldfire/howler.js/pull/720)).
- `FIXED` Audio clipping in Internet Explorer when network latency is present with HTML5 Audio ([#720](https://github.com/goldfire/howler.js/pull/720)).
- `FIXED` Allow passing just an event and ID to turn off listener ([#767](https://github.com/goldfire/howler.js/issues/767)).
- `FIXED` `npm` warning caused by invalid license definition ([#763](https://github.com/goldfire/howler.js/pull/763)).

## 2.0.3 (March 11, 2017)
- `CHANGED` Unloading a sound no longer fires the `end` event ([#675](https://github.com/goldfire/howler.js/pull/675)).
- `FIXED` Remove `setTimeout` wrapper on HTML5 `play` call to fix issues on mobile browsers ([#694](https://github.com/goldfire/howler.js/pull/694)).
- `FIXED` Remove rare possibility of duplicate sound ID's by using global counter ([#709](https://github.com/goldfire/howler.js/issues/709)).
- `FIXED` Support fades with 2+ decimal places ([#696](https://github.com/goldfire/howler.js/issues/696)).
- `FIXED` Error in Firefox caused by invalid silent WAV on `unload` ([#678](https://github.com/goldfire/howler.js/issues/678)).
- `FIXED` Check for and warn about missing file extension ([#680](https://github.com/goldfire/howler.js/issues/680)).
- `FIXED` Regression in Firefox relating to spatial audio ([#664](https://github.com/goldfire/howler.js/issues/664)).

## 2.0.2 (December 4, 2016)
- `FIXED` Wait to begin playback until AudioContext has resumed ([#643](https://github.com/goldfire/howler.js/issues/643)).
- `FIXED` Run `noAudio` check on initial setup instead of waiting for first `Howl` ([#619](https://github.com/goldfire/howler.js/issues/619)).
- `FIXED` Add `play` event to start of queue when `autoplay` is used ([#659](https://github.com/goldfire/howler.js/issues/659)).
- `FIXED` Make sure `seek` and `duration` are always >= 0 to prevent errors ([#682](https://github.com/goldfire/howler.js/pull/652)).
- `FIXED` Audio test wouldn't work in IE11 Enhanced Security Mode ([#631](https://github.com/goldfire/howler.js/pull/631)).
- `FIXED` Ensure AudioContext exists on `unload` ([#646](https://github.com/goldfire/howler.js/pull/646)).
- `FIXED` Always fire pause event even if sound is already paused ([#639](https://github.com/goldfire/howler.js/issues/639)).

## 2.0.1 (October 14, 2016)
- `ADDED` Support for FLAC audio files.
- `FIXED` Improve fading performance when short fade times are used ([#621](https://github.com/goldfire/howler.js/issues/621)).
- `FIXED` Correctly handle fades from 0 to 0 volume ([#575](https://github.com/goldfire/howler.js/issues/575)).
- `FIXED` Prevent a load error from blocking all future playback ([#613](https://github.com/goldfire/howler.js/issues/613)).
- `FIXED` Reset `noAudio` to `false` when a sound is unloaded ([#617](https://github.com/goldfire/howler.js/pull/617)).
- `FIXED` Stop a sound even if it is not playing ([#595](https://github.com/goldfire/howler.js/issues/595)).
- `FIXED` Emit `stop` event before returning from `stop` ([#616](https://github.com/goldfire/howler.js/pull/616)).
- `FIXED` Improve codec checks by removing `x-` prefix ([#576](https://github.com/goldfire/howler.js/issues/576)).
- `FIXED` Set correct loop start/end when calling `loop` on a sprite ([#604](https://github.com/goldfire/howler.js/issues/604)).

## 2.0.0 (July 19, 2016)
This major release contains just a few breaking changes outlined below. Howler.js has been rewritten from the ground up using the knowledge and work since the initial release. There's a long list of additions and improvements, which I urge you to read through as the library has evolved quite a bit over this time.

The biggest change is how you should think about your audio when using howler.js. There is now the concept of global (`Howler`), group (`Howl`) and single sound (`Sound`). Each sound that is played gets its own `Sound` object that can be manipulated, giving much greater control over playback, whether using sprites or not. `Howl` method calls can then apply to one sound or all in the group.

```
Howler (global) ->
        Howl (group) ->
                Sound (single)
```

Howler.js now also has the concept of plugins. The core represents 100% compatibility across hTML5 Audio and Web Audio, adhering to the initial goals of the library. There is also a new Spatial Plugin that adds 3D and stereo audio support only available in the Web Audio API.

Read more about the update [in this blog post](http://goldfirestudios.com/blog/143/howler.js-v2.0-Released).

### Breaking Changes
- The `buffer` option is now named `html5`. Use this to force HTML5 Audio usage.
- The `urls` option is now named `src` to specify the audio file(s) to play.
- The `pos` method has been renamed to `seek`.

```javascript
// Change the seek position of a sound (in seconds).
sound.seek(10);
```

- `mute` and `unmute` have been consolidated into `mute`.

```javascript
// Mute a sound (or all sounds).
sound.mute(true);
Howler.mute(true);

// Unmute a sound (or all sounds).
sound.mute(false);
Howler.mute(false);
```

- The `play` method no longer takes a callback and immediately returns the playback sound id (this means you can no longer chain onto the `play` method, but all others work the same).

```javascript
// Get sound id for a specific playback.
var id = sound.play();

// Pause this playback.
sound.pause(id);
```

- The deprecated `fadeIn` and `fadeOut` methods have been removed in favor of the single `fade` method.

```javascript
// Fade in a sound.
sound.fade(0, 1, 1000);

// Fade out the sound once the previous fade has ended.
sound.once('fade', function(){
  sound.fade(1, 0, 1000);
});
```

### New Features
- Lots of general code cleanup, simplification and reorganization.
- Howler.js is now modularized. The core represents the initial goal for howler.js with 100% compatibility across HTML5 Audio and Web Audio. The spatial plugin adds spatial and stereo support through Web Audio API.
- The new structure allows for full control of sprite playback (this was buggy or didn't work at all before).
- New `once` method to setup event listeners that will automatically remove themselves once fired.
- New `playing` method that will return `true` if the specified sound is currently playing.
- New `duration` method that will return the duration of the audio source.
- New `state` method that will return the loaded state of the Howl.
- New `preload` option to allow disabling the auto-preload functionality.
- New events: `fade`, `stop`, `mute`, `volume`, `rate`, `seek`.
- New `rate` method that allows changing playback rate at runtime.
- New global `unload` method that unloads all active Howls and resets the `AudioContext` to clear memory.
- New `pool` option to allow setting the inactive sound pool size (for advanced use, still defaults to 5).
- Support for playback of Dolby Audio files.
- Support for .webm extension in addition to .weba.
- Support for playback of CAFF audio files.
- (Spatial) New `Howler` listener methods `stereo`, `pos` and `orientation`.
- (Spatial) New `Howl` methods `stereo`, `pos`, `orientation` and `pannerAttr` to control stereo and spatial audio of single sounds or groups of sounds.
- (Spatial) `pannerAttr` allows for control of `coneInnerAngle`, `coneOUterAngle`, `coneOuterGain`, `distanceModel`, `maxDistance`, `panningModel`, `refDistance` and `rolloffFactor`.
- Third parameter to `on`, `once` and `off` to allow listening or removing events for only a specific sound id.
- The following methods now alter all sounds within a `Howl` group when no `id` is passed: `pause`, `stop`, `volume`, `fade`, `mute`, `loop`, `rate`.
- New codec recommendations and notes have been added to the documentation.
- Web Audio AudioContext now automatically suspends and resumes to lower processing and power usage.

### Bug Fixes
- Improved the `ext` option and made it especially usefully for playing streams (for example, SoundCloud).
- The `fade` method now uses native Web Audio fading when in that mode.
- Fades are now automatically stopped when a new one is started, volume is changed or the sound is paused/stopped.
- Moved any needed try/catch statements into own methods to prevent de-optimization in V8 and others.
- Automatically checks for disabled audio in Internet Explorer.
- An internal event queue is now used to fix issues caused by multiple actions pre-load.
- When using Web Audio, a panner node is only added when spatial audio is used.
- The `rate` option now changes the playback rate on both Web Audio and HTML5 Audio.
- The event system has been overhauled to be more reliable.
- Methods called before a sound has loaded no longer cause events to stick in the queue.
- The `end` event correctly fires at the end of each loop when using Web Audio.
- Several issues with playback of sprites.
- Several issues with playback timing after pausing sounds.
- Improved support for seeking a sound while it is playing.
- When playback rate is changed, the `end` event now fires at the correct time.
- Potential memory leak when using the `unload` method.
- Calling `pause` on a sound that hasn't yet loaded now works correctly.
- Muting a sound while it is fading now works.
- Playback of base64 encoded sounds in Internet Explorer 9.
- MIME check for some base64 encoded MP3's.
- Now tries to automatically unlock audio on mobile browsers besides Mobile Safari.
- Falls back to HTML5 Audio when loading an HTTP file on an HTTPS page (avoids Mixed Content errors).
- Stopping a stream is now possible, along with various other fixes.
- Audio on Chrome for Android no longer gets stuck after a period of inactivity.
- Crash in iOS <9 webview.
- Bug in iOS that can cause audio distortion when opening/closing browser.
- Only setup AudioContext after first `Howl` is setup so that background audio on mobile devices behaves as expected.

## 1.1.29 (January 22, 2016)
- `ADDED` Error messages added onto each `loaderror` event (thanks Philip Silva).
- `FIXED` Various edge-case bugs by no longer comparing functions by string in `.off()` (thanks richard-livingston).
- `FIXED` Edge case where multiple overlapping instances of the same sound won't all fire `end` (thanks richard-livingston).
- `FIXED` `end` event now fires correctly when changing the `rate` of a sound.

## 1.1.28 (October 22, 2015)
- `FIXED` Typo with iOS enabler that was preventing it from working.

## 1.1.27 (October 2, 2015)
- `FIXED` Automatic audio unlocking on iOS 9 by switching to `touchend` from `touchstart`.

## 1.1.26 (April 21, 2015)
- `FIXED` Looping in Chrome due to a change in the Web Audio spec implemented in Chrome 42.

## 1.1.25 (July 29, 2014)
- `ADDED` The `AudioContext` is now available on the global `Howler` object (thanks Matt DesLauriers).
- `FIXED` When falling back to HTML5 Audio due to XHR error, delete cache for source file to prevent multi-playback issues.

## 1.1.24 (July 20, 2014)
- `FIXED` Improved performance of loading files using data URIs (thanks Rob Wu).
- `FIXED` Data URIs now work with Web Audio API (thanks Rob Wu).
- `FIXED` Omitting the second parameter of the `off` method now correctly clears all events by that name (thanks Gabriel Munteanu).
- `FIXED` Fire `end` event when unloading playing sounds.
- `FIXED` Small error fix in iOS check.

## 1.1.23 (July 2, 2014)
- `FIXED` Playing multiple sprites rapidly with HTML5 Audio cause the sprite to break due to a v1.1.22 update.
- `FIXED` Don't run the iOS test if there is no audio context, which prevents a breaking error.

## 1.1.22 (June 28, 2014)
- `ADDED` Howler will now automatically attempt to unlock audio on iOS (thanks Federico Brigante).
- `ADDED` New `codecs` global Howler method to check for codec support in the current browser (thanks Jay Oster).
- `FIXED` End timers are now correctly cleaned up when a sound naturally completes rather than being forced to stop.

## 1.1.21 (May 28, 2014)
- `ADDED` Support for npm and bower (thanks Morantron).
- `ADDED` Support for audio/aac, audio/m4a and audio/mp4 mime types (thanks Federico Brigante).
- `FIXED` Calculation of duration after pausing a sprite that was sometimes causing unexpected behavior.
- `FIXED` Clear the event listener when creating a new HTML5 Audio node.

## 1.1.20 (April 18, 2014)
- `ADDED` When using Web Audio API, the panningModel now defaults to 'equalpower' to give higher quality sound. It then automatically switches to 'HRTF' when using 3D sound. This can also be overridden with the new `model` property.
- `FIXED` Another bug causing issues in CocoonJS (thanks Olivier Biot).
- `FIXED` Issue that could have caused invalid state errors and a memory leak when unloading in Internet Explorer.
- `FIXED` The documentation has been updated to include the `rate` property.

## 1.1.19 (April 14, 2014)
- `ADDED` Added CocoonJS support (thanks Olivier Biot).
- `FIXED` Several issues with pausing sprite instances by overhauling how end timers are tracked and cleared internally.
- `FIXED` Prevent error when using a server-side require where window is absent (thanks AlexMost).

## 1.1.18 (March 23, 2014)
- `FIXED` Muting a looping sound now correctly keeps the sound muted when using HTML5 Audio.
- `FIXED` Wrap AudioContext creation in try/catch to gracefully handle browser bugs: [Chromium issue](https://code.google.com/p/chromium/issues/detail?id=308784) (thanks Chris Buckley).
- `FIXED` Listen for HTML5 Audio errors and fire `loaderror` if any are encountered (thanks digitaltonic).

## 1.1.17 (February 5, 2014)
- `FIXED` Another bug in Chrome that would throw an error when pausing/stopping when a source is already stopped.
- `ADDED` CommonJS support for things like Browserify (thanks Michal Kuklis).
- `ADDED` Support for playback mp4 files.
- `ADDED` Expose the `noAudio` variable to the global `Howler` object.
- `FIXED` A rounding error that was causing HTML5 Audio to cut off early on some environments.
- `FIXED` The `onend` callback now correctly fires when changing the pos of a sound after it has started playing and when it is using HTML5 Audio.

## 1.1.16 (January 8, 2014)
- `FIXED` Prevent InvalidStateError when unloading a sound that has already been stopped.
- `FIXED` Bug in unload method that prevented the first sound from being unloaded.

## 1.1.15 (December 28, 2013)
- `FIXED` Bug that prevented master volume from being set to 0.
- `FIXED` Bug that prevented initial volume from being set to 0.
- `FIXED` Update the README to accurately show `autoplay` as defaulting to `false`.
- `FIXED` Call `loaderror` when decodeAudioData fails.
- `FIXED` Bug in setting position on an active playing WebAudio node through 'pos(position, id)' (thanks Arjun Mehta).
- `FIXED` An issue with looping after resuming playback when in WebAudio playback (thanks anzev).

## 1.1.14 (October 18, 2013)
- `FIXED` Critical bug fix that was breaking support on some browsers and some codecs.

## 1.1.13 (October 17, 2013)
- `FIXED` Code cleanup by removing redundant `canPlay` object (thanks Fabien).
- `FIXED` File extensions are now detected correctly if there is a query string with dots in the filename (thanks theshock).
- `FIXED` Fire `onloaderror` if a bad filename is passed with the `urls` property.

## 1.1.12 (September 12, 2013)
- `UPDATED` Changed AMD definition to anonymous module and define it as global always (thanks Fabien).
- `ADDED` Added the `rate` property to `Howl` object creation, allowing you to specify the playback rate. This only works when using Web Audio (thanks Qqwy).
- `FIXED` Prevent some instances of IE9 from throwing "Not Implemented" error (thanks Tero Tilus).

## 1.1.11 (July 28, 2013)
- `FIXED` Bug caused by trying to disconnect audio node when using HTML5 Audio.
- `FIXED` Correctly return the sound's position when it is paused.
- `FIXED` Another bug that caused looping sounds to not always correctly resume after a pause.

## 1.1.10 (July 26, 2013)
- `ADDED` New `unload` method to destroy a Howl object. This will stop all associated sounds instantly and remove the sound from the cache.
- `FIXED` When using Web Audio, loop from the correct position after pausing the sound halfway through.
- `FIXED` Always return a number when getting a sound's position with the `pos` method, and always return the reference to the sound when setting a sound that hasn't loaded.

## 1.1.9 (July 11, 2013)
- `FIXED` Issue where calling the `volume` method before a sound had loaded prevented the volume from being changed.

## 1.1.8 (July 10, 2013)
- `FIXED` `urls` method now works again, and can take a string rather than an array if only one url is being passed.
- `FIXED` Make `node.play` async when not using webAudio (thanks Alex Dong).

## 1.1.7 (May 30, 2013)
- `FIXED` Hotfix for a missing parameter that somehow missed the 1.1.6 commit in global muting.

## 1.1.6 (May 30, 2013)
- `ADDED` A general `fade` method that allows a playing sound to be faded from one volume to another.
- `DEPRECATED` The `fadeIn` and `fadeOut` methods should no longer be used and have been deprecated. These will be removed in a future major release.
- `FIXED` No longer require the sprite parameter to be passed into the `play` method when just passing a callback function.
- `FIXED` Cleaned up global muting code. (thanks arnorhs).

## 1.1.5 (May 3, 2013)
- `ADDED` Support for the Ogg Opus codec (thanks Andrew Carpenter).
- `ADDED` Semver tags for easy package management (thanks Martin Reurings).
- `ADDED` Improve style/readability of code that discovers which audio file extension to use (thanks Fabien).
- `ADDED` The `onend` event now passes the soundId back as the 2nd parameter of the callback (thanks Ross Cairns).
- `FIXED` A few small typos in the comments. (thanks VAS).

## 1.1.4 (April 28, 2013)
- `FIXED` A few small bugs that broke global mute and unmute when using HTML5 Audio.

## 1.1.3 (April 27, 2013)
- `FIXED` Bug that prevented global mute from working 100% of the time when using HTML5 Audio.

## 1.1.2 (April 24, 2013)
- `FIXED` Calling `volume` before `play` now works as expected.
- `FIXED` Edge case issue with cache cleaning.
- `FIXED` Load event didn't fire when new URLs were loaded after the initial load.

## 1.1.1 (April 17, 2013)
- `ADDED` `onloaderror` event fired when sound fails to load (thanks Thiago de Barros Laceda).
- `ADDED` `format` property that overrides the URL extraction of the file format (thanks Kenan Shifflett).
- `FIXED` AMD implementation now only defines one module and removes global scope (thanks Kenan Shifflett).
- `FIXED` Broken chaining with `play` method.

## 1.1.0 (April 11, 2013)
- `ADDED` New `pos3d` method that allows for positional audio (Web Audio API only).
- `ADDED` Multi-playback control system that allows for control of specific play instances when sprites are used. A callback has been added to the `play` method that returns the `soundId` for the playback instance. This can then be passed as the optional last parameter to other methods to control that specific playback instead of the whole sound object.
- `ADDED` Pass the `Howl` object reference as the first parameter in the custom event callbacks.
- `ADDED` New optional parameter in sprite definitions to define a sprite as looping rather than the whole track. In the sprite definition array, set the 3rd value to true for looping (`spriteName: [pos, duration, loop]`).
- `FIXED` Now all audio acts as a sound sprite internally, which helps to fix several lingering bugs (doesn't affect the API at all).
- `FIXED` Improved implementation of Web Audio API looping.
- `FIXED` Improved implementation of HTML5 Audio looping.
- `FIXED` Issue that caused the fallback to not work when testing locally.
- `FIXED` Fire `onend` event at the end of `fadeOut`.
- `FIXED` Prevent errors from being thrown on browsers that don't support HTML5 Audio.
- `FIXED` Various code cleanup and optimizations.

## 1.0.13 (March 20, 2013)
- `ADDED` Support for AMD loading as a module (thanks @mostlygeek).

## 1.0.12 (March 28, 2013)
- `ADDED` Automatically switch to HTML5 Audio if there is an error due to CORS.
- `FIXED` Check that only numbers get passed into volume methods.

## 1.0.11 (March 8, 2013)
- `ADDED` Exposed `usingWebAudio` value through the global `Howler` object.
- `FIXED` Issue with non-sprite HTML5 Audio clips becoming unplayable (thanks Paul Morris).

## 1.0.10 (March 1, 2013)
- `FIXED` Issue that caused simultaneous playback of audio sprites to break while using HTML5 Audio.

## 1.0.9 (March 1, 2013)
- `ADDED` Spec-implementation detection to cover new and deprecated Web Audio API methods (thanks @canuckistani).

## 1.0.8 (February 25, 2013)
- `ADDED` New `onplay` event.
- `ADDED` Support for playing audio from base64 encoded strings.
- `FIXED` Issue with soundId not being unique when multiple sounds were played simultaneously.
- `FIXED` Verify that an HTML5 Audio Node is ready to play before playing it.
- `FIXED` Issue with `onend` timer not getting cleared all the time.

## 1.0.7 (February 18, 2013)
- `FIXED` Cancel the correct timer when multiple HTML5 Audio sounds are played at the same time.
- `FIXED` Make sure howler.js is future-compatible with UglifyJS 2.
- `FIXED` Duration now gets set correctly when pulled from cache.
- `FIXED` Tiny typo in README.md (thanks @johnfn).

## 1.0.6 (February 8, 2013)
- `FIXED` Issue with global mute calls happening before an HTML5 Audio element is loaded.

## 1.0.5 (February 7, 2013)
- `FIXED` Global mute now also mutes all future sounds that are played until `unmute` is called.

## 1.0.4 (February 6, 2013)
- `ADDED` Support for WebM audio.
- `FIXED` Issue with volume changes when on HTML5 Audio.
- `FIXED` Round volume values to fix inconsistencies in fade in/out methods.

## 1.0.3 (February 2, 2013)
- `FIXED` Make sure `self` is always defined before returning it. 

## 1.0.2 (February 1, 2013)
- `ADDED` New `off` method that allows for the removal of custom events.
- `FIXED` Issue with chaining the `on` method.
- `FIXED` Small typo in documentation.

## 1.0.1 (January 30, 2013)
- `ADDED` New `buffer` property that allows you to force the use of HTML5 on specific sounds to allow streaming of large audio files.
- `ADDED` Support for multiple events per event type.
- `FIXED` Issue with method chaining before a sound was ready to play.
- `FIXED` Use `self` everywhere instead of `this` to maintain consistency.

## 1.0.0 (January 28, 2013)
- First commit
