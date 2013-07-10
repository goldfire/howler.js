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