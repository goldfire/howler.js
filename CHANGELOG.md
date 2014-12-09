## 2.0.0 (TBD)
This major release contains breaking changes (migration guide), but should be very familiar. Howler.js has been rewritten from the ground up using the knowledge and work since the initial release. There's a long list of additions and improvements, which I urge you to read through.

The biggest change is how you should think about your audio when using howler.js. There is now the concept of global (`Howler`), group (`Howl`) and single sound (`Sound`). Each sound that is played gets its own `Sound` object that can be manipulated, giving much greater control over playback, whether using sprites or not. `Howl` method calls can then apply to one sound or all in the group.

```
Howler (global) ->
        Howl (group) ->
                Sound (single)
```

Howler.js now also has the concept of plugins. The core represents 100% compatibility across hTML5 Audio and Web Audio, adhering to the initial goals of the library. There is also a new Effects Plugin that adds advanced features only available in the Web Audio API.

- `ADDED`: Lots of general code cleanup, simplification and reogranziation.
- `ADDED`: Howler.js is now modularized. The core represents the initial goal for howler.js with 100% compatibility across hTML5 Audio and Web Audio. The effects plugin adds many of the advanced features provided by the Web Audio API.
- `ADDED`: The new structure allows for full control of sprite playback (this was buggy or didn't work at all before).
- `ADDED`: New `once` method to setup event listeners that will automatically remove themselves once fired.
- `ADDED`: New `playing` method that will return `true` if the specified sound is currently playing.
- `ADDED`: New `duration` method that will return the duration of the audio source.
- `ADDED`: New `preload` property to allow disabling the auto-preload functionality.
- `ADDED`: New `faded` event that fires at the completion of a fade-in or fade-out.
- `ADDED`: New `pool` property to allow setting the inactive sound pool size (for advanced use, still defaults to 5).
- `ADDED`: Third parameter to `on`, `once` and `off` to allow listening or removing events for only a specific sound id.
- `ADDED`: The following methods now alter all sounds within a `Howl` group when no `id` is passed: `pause`, `stop`, `volume`, `fade`, `mute`, `loop`.
- `ADDED`: The `rate` property now changes the playback rate on both Web Audio and HTML5 Audio.
- `ADDED`: Support for .webm extension in addition to .weba.
- `ADDED`: New codec recommendations and notes have been added to the documentation.
- `ADDED`: (Effects) New `Howler` listener methods `pos`, `orientation`, `velocity` and `listenerAttr`.
- `ADDED`: (Effects) New `Howl` methods `pos`, `orientation`, `velocity` and `pannerAttr` to control spatial audio of single sounds or groups of sounds.
- `ADDED`: (Effects) `pannerAttr` allows for control of `coneInnerAngle`, `coneOUterAngle`, `coneOuterGain`, `distanceModel`, `maxDistance`, `panningModel`, `refDistance` and `rolloffFactor`.
- `UPDATED`: (Effects) When using Web Audio, a panner node is only added when spatial audio is used.
- `UPDATED`: The `play` method no longer takes a callback and immediately returns the playback sound id (this means you can no longer chain onto the `play` method, but all others work the same).
- `UPDATED`: Changed property names `buffer` to `html5` and `pos` to `seek`.
- `UPDATED`: The global, group and single sound `mute` and `unmute` methods have been combined into a single `mute` method.
- `UPDATED`: The AMD definition is now namespaced to `howler`.
- `UPDATED`: The deprecated `fadeIn` and `fadeOut` methods have been removed in favor of the single `fade` method.
- `UPDATED`: Improved the `ext` property and made it especially usefully for playing streams (for example, SoundCloud).
- `UPDATED`: The `fade` method now only uses timeouts as a fallback with HTML5 Audio.
- `UPDATED`: Moved any needed try/catch statements into own methods to prevent de-optimization in V8 and others.
- `UPDATED`: Updated and improved overall documentation.
- `FIXED`: The event system has been overhauled to be more reliable.
- `FIXED`: Methods called before a sound has loaded no longer cause events to stick in the queue.
- `FIXED`: The `end` event correctly fires at the end of each loop when using Web Audio.
- `FIXED`: Fixed several issues with playback of sprites.
- `FIXED`: Fixed several issues with playback timing after pausing sounds.
- `FIXED`: Improved support for seeking a sound while it is playing.
- `FIXED`: When playback rate is changed, the `end` event now fires at the correct time.
- `FIXED`: Fixed a potential memory leak when using the `unload` method.
- `FIXED`: Calling `pause` on a sound that hasn't yet loaded now works correctly.
- `FIXED`: Muting a sound while it is fading now works.
- `FIXED`: Playback of base64 encoded sounds in Internet Explorer 9.
- `FIXED`: MIME check for some base64 encoded MP3's.

## 1.1.25 (July 29, 2014)
- `ADDED`: The `AudioContext` is now available on the global `Howler` object (thanks Matt DesLauriers).
- `FIXED`: When falling back to HTML5 Audio due to XHR error, delete cache for source file to prevent multi-playback issues.

## 1.1.24 (July 20, 2014)
- `FIXED`: Improved performance of loading files using data URIs (thanks Rob Wu).
- `FIXED`: Data URIs now work with Web Audio API (thanks Rob Wu).
- `FIXED`: Omitting the second parameter of the `off` method now correctly clears all events by that name (thanks Gabriel Munteanu).
- `FIXED`: Fire `end` event when unloading playing sounds.
- `FIXED`: Small error fix in iOS check.

## 1.1.23 (July 2, 2014)
- `FIXED`: Playing multiple sprites rapdily with HTML5 Audio cause the sprite to break due to a v1.1.22 update.
- `FIXED`: Don't run the iOS test if there is no audio context, which prevents a breaking error.

## 1.1.22 (June 28, 2014)
- `ADDED`: Howler will now automatically attempt to unlock audio on iOS (thanks Federico Brigante).
- `ADDED`: New `codecs` global Howler method to check for codec support in the current browser (thanks Jay Oster).
- `FIXED`: End timers are now correctly cleaned up when a sound naturally completes rather than being forced to stop.

## 1.1.21 (May 28, 2014)
- `ADDED`: Support for npm and bower (thanks Morantron).
- `ADDED`: Support for audio/aac, audio/m4a and audio/mp4 mime types (thanks Federico Brigante).
- `FIXED`: Fixed calculation of duration after pausing a sprite that was sometimes causing unexpected behavior.
- `FIXED`: Clear the event listener when creating a new HTML5 Audio node.

## 1.1.20 (April 18, 2014)
- `ADDED`: When using Web Audio API, the panningModel now defaults to 'equalpower' to give higher quality sound. It then automatically switches to 'HRTF' when using 3D sound. This can also be overridden with the new `model` property.
- `FIXED`: Fixed another bug causing issues in CocoonJS (thanks Olivier Biot).
- `FIXED`: Fixed an issue that could have caused invalid state errors and a memory leak when unloading in Internet Explorer.
- `FIXED`: The documentation has been updated to include the `rate` property.

## 1.1.19 (April 14, 2014)
- `ADDED`: Added CocoonJS support (thanks Olivier Biot).
- `FIXED`: Fixed several issues with pausing sprite instances by overhauling how end timers are tracked and cleared internally.
- `FIXED`: Prevent error when using a server-side require where window is absent (thanks AlexMost).

## 1.1.18 (March 23, 2014)
- `FIXED`: Muting a looping sound now correctly keeps the sound muted when using HTML5 Audio.
- `FIXED`: Wrap AudioContext creation in try/catch to gracefully handle browser bugs: [Chromium issue](https://code.google.com/p/chromium/issues/detail?id=308784) (thanks Chris Buckley).
- `FIXED`: Listen for HTML5 Audio errors and fire `loaderror` if any are encountered (thanks digitaltonic).

## 1.1.17 (February 5, 2014)
- `FIXED`: Fix another bug in Chrome that would throw an error when pausing/stopping when a source is already stopped.
- `ADDED`: CommonJS support for things like Browserify (thanks Michal Kuklis).
- `ADDED`: Support for playback mp4 files.
- `ADDED`: Expose the `noAudio` variable to the global `Howler` object.
- `FIXED`: Fix a rounding error that was causing HTML5 Audio to cut off early on some environments.
- `FIXED`: The `onend` callback now correctly fires when changing the pos of a sound after it has started playing and when it is using HTML5 Audio.

## 1.1.16 (January 8, 2014)
- `FIXED`: Prevent InvalidStateError when unloading a sound that has already been stopped.
- `FIXED`: Fix bug in unload method that prevented the first sound from being unloaded.

## 1.1.15 (December 28, 2013)
- `FIXED`: Fix bug that prevented master volume from being set to 0.
- `FIXED`: Fix bug that prevented initial volume from being set to 0.
- `FIXED`: Update the README to accurately show `autoplay` as defaulting to `false`.
- `FIXED`: Call `loaderror` when decodeAudioData fails.
- `FIXED`: Fix bug in setting position on an active playing WebAudio node through 'pos(position, id)' (thanks Arjun Mehta).
- `FIXED`: Fix an issue with looping after resuming playback when in WebAudio playback (thanks anzev).

## 1.1.14 (October 18, 2013)
- `FIXED`: Critical bug fix that was breaking support on some browsers and some codecs.

## 1.1.13 (October 17, 2013)
- `FIXED`: Code cleanup by removing redundant `canPlay` object (thanks Fabien).
- `FIXED`: File extensions are now detected correctly if there is a query string with dots in the filename (thanks theshock).
- `FIXED`: Fire `onloaderror` if a bad filename is passed with the `urls` property.

## 1.1.12 (September 12, 2013)
- `UPDATED`: Changed AMD definition to anonymous module and define it as global always (thanks Fabien).
- `ADDED`: Added the `rate` property to `Howl` object creation, allowing you to specify the playback rate. This only works when using Web Audio (thanks Qqwy).
- `FIXED`: Prevent some instances of IE9 from throwing "Not Implemented" error (thanks Tero Tilus).

## 1.1.11 (July 28, 2013)
- `FIXED`: Fix bug caused by trying to disconnect audio node when using HTML5 Audio.
- `FIXED`: Correctly return the sound's position when it is paused.
- `FIXED`: Fix another bug that caused looping sounds to not always correctly resume after a pause.

## 1.1.10 (July 26, 2013)
- `ADDED`: New `unload` method to destroy a Howl object. This will stop all associated sounds instantly and remove the sound from the cache.
- `FIXED`: When using Web Audio, loop from the correct position after pausing the sound halfway through.
- `FIXED`: Always return a number when getting a sound's position with the `pos` method, and always return the reference to the sound when setting a sound that hasn't loaded.

## 1.1.9 (July 11, 2013)
- `FIXED`: Fixed issue where calling the `volume` method before a sound had loaded prevented the volume from being changed.

## 1.1.8 (July 10, 2013)
- `FIXED`: `urls` method now works again, and can take a string rather than an array if only one url is being passed.
- `FIXED`: Make `node.play` async when not using webAudio (thanks Alex Dong).

## 1.1.7 (May 30, 2013)
- `FIXED`: Hotfix for a missing parameter that somehow missed the 1.1.6 commit in global muting.

## 1.1.6 (May 30, 2013)
- `ADDED`: A general `fade` method that allows a playing sound to be faded from one volume to another.
- `DEPRECATED`: The `fadeIn` and `fadeOut` methods should no longer be used and have been deprecated. These will be removed in a future major release.
- `FIXED`: No longer require the sprite parameter to be passed into the `play` method when just passing a callback function.
- `FIXED`: Cleaned up global muting code. (thanks arnorhs).

## 1.1.5 (May 3, 2013)
- `ADDED`: Support for the Ogg Opus codec (thanks Andrew Carpenter).
- `ADDED`: Semver tags for easy package management (thanks Martin Reurings).
- `ADDED`: Improve style/readability of code that discovers which audio file extension to use (thanks Fabien).
- `ADDED`: The `onend` event now passes the soundId back as the 2nd parameter of the callback (thanks Ross Cairns).
- `FIXED`: A few small typos in the comments. (thanks VAS).

## 1.1.4 (April 28, 2013)
- `FIXED`: A few small bugs that broke global mute and unmute when using HTML5 Audio.

## 1.1.3 (April 27, 2013)
- `FIXED`: Bug that prevented global mute from working 100% of the time when using HTML5 Audio.

## 1.1.2 (April 24, 2013)
- `FIXED`: Calling `volume` before `play` now works as expected.
- `FIXED`: Edge case issue with cache cleaning.
- `FIXED`: Load event didn't fire when new URLs were loaded after the initial load.

## 1.1.1 (April 17, 2013)
- `ADDED`: `onloaderror` event fired when sound fails to load (thanks Thiago de Barros Laceda).
- `ADDED`: `format` property that overrides the URL extraction of the file format (thanks Kenan Shifflett).
- `FIXED`: AMD implementation now only defines one module and removes global scope (thanks Kenan Shifflett).
- `FIXED`: Broken chaining with `play` method.

## 1.1.0 (April 11, 2013)
- `ADDED:` New `pos3d` method that allows for positional audio (Web Audio API only).
- `ADDED:` Multi-playback control system that allows for control of specific play instances when sprites are used. A callback has been added to the `play` method that returns the `soundId` for the playback instance. This can then be passed as the optional last parameter to other methods to control that specific playback instead of the whole sound object.
- `ADDED:` Pass the `Howl` object reference as the first parameter in the custom event callbacks.
- `ADDED:` New optional parameter in sprite defintions to define a sprite as looping rather than the whole track. In the sprite definition array, set the 3rd value to true for looping (`spriteName: [pos, duration, loop]`).
- `FIXED:` Now all audio acts as a sound sprite internally, which helps to fix several lingering bugs (doesn't affect the API at all).
- `FIXED:` Improved implementation of Web Audio API looping.
- `FIXED:` Improved implementation of HTML5 Audio looping.
- `FIXED:` Issue that caused the fallback to not work when testing locally.
- `FIXED:` Fire `onend` event at the end of `fadeOut`.
- `FIXED:` Prevent errors from being thrown on browsers that don't support HTML5 Audio.
- `FIXED:` Various code cleanup and optimizations.

## 1.0.13 (March 20, 2013)
- `ADDED:` Support for AMD loading as a module (thanks @mostlygeek).

## 1.0.12 (March 28, 2013)
- `ADDED:` Automatically switch to HTML5 Audio if there is an error due to CORS.
- `FIXED:` Check that only numbers get passed into volume methods.

## 1.0.11 (March 8, 2013)
- `ADDED:` Exposed `usingWebAudio` value through the global `Howler` object.
- `FIXED:` Issue with non-sprite HTML5 Audio clips becoming unplayable (thanks Paul Morris).

## 1.0.10 (March 1, 2013)
- `FIXED:` Issue that caused simultaneous playback of audio sprites to break while using HTML5 Audio.

## 1.0.9 (March 1, 2013)
- `ADDED:` Spec-implementation detection to cover new and deprecated Web Audio API methods (thanks @canuckistani).

## 1.0.8 (February 25, 2013)
- `ADDED:` New `onplay` event.
- `ADDED:` Support for playing audio from base64 encoded strings.
- `FIXED:` Issue with soundId not being unique when multiple sounds were played simultaneously.
- `FIXED:` Verify that an HTML5 Audio Node is ready to play before playing it.
- `FIXED:` Issue with `onend` timer not getting cleared all the time.

## 1.0.7 (February 18, 2013)
- `FIXED:` Cancel the correct timer when multiple HTML5 Audio sounds are played at the same time.
- `FIXED:` Make sure howler.js is future-compatible with UglifyJS 2.
- `FIXED:` Duration now gets set correctly when pulled from cache.
- `FIXED:` Tiny typo in README.md (thanks @johnfn).

## 1.0.6 (February 8, 2013)
- `FIXED:` Issue with global mute calls happening before an HTML5 Audio element is loaded.

## 1.0.5 (February 7, 2013)
- `FIXED:` Global mute now also mutes all future sounds that are played until `unmute` is called.

## 1.0.4 (February 6, 2013)
- `ADDED:` Support for WebM audio.
- `FIXED:` Issue with volume changes when on HTML5 Audio.
- `FIXED:` Round volume values to fix inconsistencies in fade in/out methods.

## 1.0.3 (February 2, 2013)
- `FIXED:` Make sure `self` is always defined before returning it. 

## 1.0.2 (February 1, 2013)
- `ADDED:` New `off` method that allows for the removal of custom events.
- `FIXED:` Issue with chaining the `on` method.
- `FIXED:` Small typo in documentation.

## 1.0.1 (January 30, 2013)
- `ADDED:` New `buffer` property that allows you to force the use of HTML5 on specific sounds to allow streaming of large audio files.
- `ADDED:` Support for multiple events per event type.
- `FIXED:` Issue with method chaining before a sound was ready to play.
- `FIXED:` Use `self` everywhere instead of `this` to maintain consistency.

## 1.0.0 (January 28, 2013)
- First commit