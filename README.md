[![howler.js](https://s3.amazonaws.com/howler.js/howler-logo.png "howler.js")](https://howlerjs.com)

# Description
[howler.js](https://howlerjs.com) is an audio library for the modern web. It defaults to [Web Audio API](http://webaudio.github.io/web-audio-api/) and falls back to [HTML5 Audio](https://html.spec.whatwg.org/multipage/embedded-content.html#the-audio-element). This makes working with audio in JavaScript easy and reliable across all platforms.

Additional information, live demos and a user showcase are available at [howlerjs.com](https://howlerjs.com).

### Features
* Single API for all audio needs
* Defaults to Web Audio API and falls back to HTML5 Audio
* Handles edge cases and bugs across environments
* Supports all codecs for full cross-browser support
* Automatic caching for improved performance
* Control sounds individually, in groups or globally
* Playback of multiple sounds at once
* Easy sound sprite definition and playback
* Full control for fading, rate, seek, volume, etc.
* Easily add 3D spatial sound or stereo panning
* Modular - use what you want and easy to extend
* No outside dependencies, just pure JavaScript
* As light as 7kb gzipped

### Browser Compatibility
Tested in the following browsers/versions:
* Google Chrome 7.0+
* Internet Explorer 9.0+
* Firefox 4.0+
* Safari 5.1.4+
* Mobile Safari 6.0+ (after user input)
* Opera 12.0+
* Microsoft Edge

### Live Demos
* [Audio Player](https://howlerjs.com/#player)
* [Radio](https://howlerjs.com/#radio)
* [Spatial Audio](https://howlerjs.com/#spatial)
* [Audio Sprites](https://howlerjs.com/#sprite)

# Documentation

### Contents
* [Quick Start](#quick-start)
* [Examples](#examples)
* [Core](#core)
  * [Options](#options)
  * [Methods](#methods)
  * [Global Options](#global-options)
  * [Global Methods](#global-methods)
* [Plugin: Spatial](#plugin-spatial)
  * [Options](#options-1)
  * [Methods](#methods-1)
  * [Global Methods](#global-methods-1)
* [Mobile Playback](#mobile-playback)
* [Dolby Audio Playback](#dolby-audio-playback)
* [Facebook Instant Games](#facebook-instant-games)
* [Format Recommendations](#format-recommendations)
* [License](#license)

### Quick Start

Several options to get up and running:

* Clone the repo: `git clone https://github.com/goldfire/howler.js.git`
* Install with [npm](https://www.npmjs.com/package/howler): `npm install howler`
* Install with [Yarn](https://yarnpkg.com/en/package/howler): `yarn add howler`
* Install with [Bower](http://bower.io/): `bower install howler`
* Hosted CDN: [`cdnjs`](https://cdnjs.com/libraries/howler) [`jsDelivr`](https://www.jsdelivr.com/projects/howler.js)

In the browser:

```html
<script src="/path/to/howler.js"></script>
<script>
    var sound = new Howl({
      src: ['sound.webm', 'sound.mp3']
    });
</script>
```

As a dependency:

```javascript
import {Howl, Howler} from 'howler';
```

```javascript
const {Howl, Howler} = require('howler');
```

### Examples

##### Most basic, play an MP3:
```javascript
var sound = new Howl({
  src: ['sound.mp3']
});

sound.play();
```

##### More playback options:
```javascript
var sound = new Howl({
  src: ['sound.webm', 'sound.mp3', 'sound.wav'],
  autoplay: true,
  loop: true,
  volume: 0.5,
  onend: function() {
    console.log('Finished!');
  }
});
```

##### Define and play a sound sprite:
```javascript
var sound = new Howl({
  src: ['sounds.webm', 'sounds.mp3'],
  sprite: {
    blast: [0, 3000],
    laser: [4000, 1000],
    winner: [6000, 5000]
  }
});

// Shoot the laser!
sound.play('laser');
```

##### Listen for events:
```javascript
var sound = new Howl({
  src: ['sound.webm', 'sound.mp3']
});

// Clear listener after first call.
sound.once('load', function(){
  sound.play();
});

// Fires when the sound finishes playing.
sound.on('end', function(){
  console.log('Finished!');
});
```

##### Control multiple sounds:
```javascript
var sound = new Howl({
  src: ['sound.webm', 'sound.mp3']
});

// Play returns a unique Sound ID that can be passed
// into any method on Howl to control that specific sound.
var id1 = sound.play();
var id2 = sound.play();

// Fade out the first sound and speed up the second.
sound.fade(1, 0, 1000, id1);
sound.rate(1.5, id2);
```

##### ES6:
```javascript
import {Howl, Howler} from 'howler';

// Setup the new Howl.
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3']
});

// Play the sound.
sound.play();

// Change global volume.
Howler.volume(0.5);
```


More in-depth examples (with accompanying live demos) can be found in the [examples directory](https://github.com/goldfire/howler.js/tree/master/examples).


## Core

### Options
#### src `Array/String` `[]` *`required`*
The sources to the track(s) to be loaded for the sound (URLs or base64 data URIs). These should be in order of preference, howler.js will automatically load the first one that is compatible with the current browser. If your files have no extensions, you will need to explicitly specify the extension using the `format` property.
#### volume `Number` `1.0`
The volume of the specific track, from `0.0` to `1.0`.
#### html5 `Boolean` `false`
Set to `true` to force HTML5 Audio. This should be used for large audio files so that you don't have to wait for the full file to be downloaded and decoded before playing.
#### loop `Boolean` `false`
Set to `true` to automatically loop the sound forever.
#### preload `Boolean` `true`
Automatically begin downloading the audio file when the `Howl` is defined.
#### autoplay `Boolean` `false`
Set to `true` to automatically start playback when sound is loaded.
#### mute `Boolean` `false`
Set to `true` to load the audio muted.
#### sprite `Object` `{}`
Define a sound sprite for the sound. The offset and duration are defined in milliseconds. A third (optional) parameter is available to set a sprite as looping. An easy way to generate compatible sound sprites is with [audiosprite](https://github.com/tonistiigi/audiosprite).
```javascript
{
  key: [offset, duration, (loop)]
}
```
#### rate `Number` `1.0`
The rate of playback. 0.5 to 4.0, with 1.0 being normal speed.
#### pool `Number` `5`
The size of the inactive sounds pool. Once sounds are stopped or finish playing, they are marked as ended and ready for cleanup. We keep a pool of these to recycle for improved performance. Generally this doesn't need to be changed. It is important to keep in mind that when a sound is paused, it won't be removed from the pool and will still be considered active so that it can be resumed later.
#### format `Array` `[]`
howler.js automatically detects your file format from the extension, but you may also specify a format in situations where extraction won't work (such as with a SoundCloud stream).
#### xhrWithCredentials `Boolean` `false`
Whether or not to enable the `withCredentials` flag on XHR requests used to fetch audio files when using Web Audio API ([see reference](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials)).
#### onload `Function`
Fires when the sound is loaded.
#### onloaderror `Function`
Fires when the sound is unable to load. The first parameter is the ID of the sound (if it exists) and the second is the error message/code.
#### onplayerror `Function`
Fires when the sound is unable to play. The first parameter is the ID of the sound and the second is the error message/code.
#### onplay `Function`
Fires when the sound begins playing. The first parameter is the ID of the sound.
#### onend `Function`
Fires when the sound finishes playing (if it is looping, it'll fire at the end of each loop). The first parameter is the ID of the sound.
#### onpause `Function`
Fires when the sound has been paused. The first parameter is the ID of the sound.
#### onstop `Function`
Fires when the sound has been stopped. The first parameter is the ID of the sound.
#### onmute `Function`
Fires when the sound has been muted/unmuted. The first parameter is the ID of the sound.
#### onvolume `Function`
Fires when the sound's volume has changed. The first parameter is the ID of the sound.
#### onrate `Function`
Fires when the sound's playback rate has changed. The first parameter is the ID of the sound.
#### onseek `Function`
Fires when the sound has been seeked. The first parameter is the ID of the sound.
#### onfade `Function`
Fires when the current sound finishes fading in/out. The first parameter is the ID of the sound.
#### onunlock `Function`
Fires when audio has been automatically unlocked through a touch/click event.
#### ondownloading `Function`
Fires while audio is being loaded (buffered) on XHR requests used to fetch audio files when using Web Audio API ([see reference](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials)). 
This event uses XHR onprogress callback ([see reference](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/onprogress)).


### Methods
#### play([sprite/id])
Begins playback of a sound. Returns the sound id to be used with other methods. Only method that can't be chained.
* **sprite/id**: `String/Number` `optional` Takes one parameter that can either be a sprite or sound ID. If a sprite is passed, a new sound will play based on the sprite's definition. If a sound ID is passed, the previously played sound will be played (for example, after pausing it). However, if an ID of a sound that has been drained from the pool is passed, nothing will play.

#### pause([id])
Pauses playback of sound or group, saving the `seek` of playback.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group are paused.

#### stop([id])
Stops playback of sound, resetting `seek` to `0`.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group are stopped.

#### mute([muted], [id])
Mutes the sound, but doesn't pause the playback.
* **muted**: `Boolean` `optional` True to mute and false to unmute.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group are stopped.

#### volume([volume], [id])
Get/set volume of this sound or the group. This method optionally takes 0, 1 or 2 arguments.
* **volume**: `Number` `optional` Volume from `0.0` to `1.0`.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group have volume altered relative to their own volume.

#### fade(from, to, duration, [id])
Fade a currently playing sound between two volumes. Fires the `fade` event when complete.
* **from**: `Number` Volume to fade from (`0.0` to `1.0`).
* **to**: `Number` Volume to fade to (`0.0` to `1.0`).
* **duration**: `Number` Time in milliseconds to fade.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group will fade.

#### rate([rate], [id])
Get/set the rate of playback for a sound. This method optionally takes 0, 1 or 2 arguments.
* **rate**: `Number` `optional` The rate of playback. 0.5 to 4.0, with 1.0 being normal speed.
* **id**: `Number` `optional` The sound ID. If none is passed, playback rate of all sounds in group will change.

#### seek([seek], [id])
Get/set the position of playback for a sound. This method optionally takes 0, 1 or 2 arguments.
* **seek**: `Number` `optional` The position to move current playback to (in seconds).
* **id**: `Number` `optional` The sound ID. If none is passed, the first sound will seek.

#### loop([loop], [id])
Get/set whether to loop the sound or group. This method can optionally take 0, 1 or 2 arguments.
* **loop**: `Boolean` `optional` To loop or not to loop, that is the question.
* **id**: `Number` `optional` The sound ID. If none is passed, all sounds in group will have their `loop` property updated.

#### state()
Check the load status of the `Howl`, returns a `unloaded`, `loading` or `loaded`.

#### playing(id)
Check if a sound is currently playing or not, returns a `Boolean`. If no sound ID is passed, check if any sound in the `Howl` group is playing.
* **id**: `Number` The sound ID to check.

#### duration([id])
Get the duration of the audio source. Will return 0 until after the `load` event fires.
* **id**: `Number` `optional` The sound ID to check. Passing an ID will return the duration of the sprite being played on this instance; otherwise, the full source duration is returned.

#### on(event, function, [id])
Listen for events. Multiple events can be added by calling this multiple times.
* **event**: `String` Name of event to fire/set (`load`, `loaderror`, `playerror`, `play`, `end`, `pause`, `stop`, `mute`, `volume`, `rate`, `seek`, `fade`, `unlock`,`downloading`).
* **function**: `Function` Define function to fire on event.
* **id**: `Number` `optional` Only listen to events for this sound id.

#### once(event, function, [id])
Same as `on`, but it removes itself after the callback is fired.
* **event**: `String` Name of event to fire/set (`load`, `loaderror`, `playerror`, `play`, `end`, `pause`, `stop`, `mute`, `volume`, `rate`, `seek`, `fade`, `unlock`,`downloading`).
* **function**: `Function` Define function to fire on event.
* **id**: `Number` `optional` Only listen to events for this sound id.

#### off(event, [function], [id])
Remove event listener that you've set. Call without parameters to remove all events.
* **event**: `String` Name of event (`load`, `loaderror`, `playerror`, `play`, `end`, `pause`, `stop`, `mute`, `volume`, `rate`, `seek`, `fade`, `unlock`,`downloading`).
* **function**: `Function` `optional` The listener to remove. Omit this to remove all events of type.
* **id**: `Number` `optional` Only remove events for this sound id.

#### load()
This is called by default, but if you set `preload` to false, you must call `load` before you can play any sounds.

#### unload()
Unload and destroy a Howl object. This will immediately stop all sounds attached to this sound and remove it from the cache.


### Global Options
#### usingWebAudio `Boolean`
`true` if the Web Audio API is available.
#### noAudio `Boolean`
`true` if no audio is available.
#### mobileAutoEnable `Boolean` `true`
Automatically attempts to enable audio on mobile (iOS, Android, etc) devices.
#### autoSuspend `Boolean` `true`
Automatically suspends the Web Audio AudioContext after 30 seconds of inactivity to decrease processing and energy usage. Automatically resumes upon new playback. Set this property to `false` to disable this behavior.
#### ctx `Boolean` *`Web Audio Only`*
Exposes the `AudioContext` with Web Audio API.
#### masterGain `Boolean` *`Web Audio Only`*
Exposes the master `GainNode` with Web Audio API. This can be useful for writing plugins or advanced usage.


### Global Methods
The following methods are used to modify all sounds globally, and are called from the `Howler` object.
#### mute(muted)
Mute or unmute all sounds.
* **muted**: `Boolean` True to mute and false to unmute.

#### volume([volume])
Get/set the global volume for all sounds, relative to their own volume.
* **volume**: `Number` `optional` Volume from `0.0` to `1.0`.

#### codecs(ext)
Check supported audio codecs. Returns `true` if the codec is supported in the current browser.
* **ext**: `String` File extension. One of: "mp3", "mpeg", "opus", "ogg", "oga", "wav", "aac", "caf", m4a", "mp4", "weba", "webm", "dolby", "flac".

#### unload()
Unload and destroy all currently loaded Howl objects. This will immediately stop all sounds and remove them from cache.


## Plugin: Spatial

### Options
#### orientation `Array` `[1, 0, 0]`
Sets the direction the audio source is pointing in the 3D cartesian coordinate space. Depending on how directional the sound is, based on the `cone` attributes, a sound pointing away from the listener can be quiet or silent.
#### stereo `Number` `null`
Sets the stereo panning value of the audio source for this sound or group. This makes it easy to setup left/right panning with a value of `-1.0` being far left and a value of `1.0` being far right.
#### pos `Array` `null`
Sets the 3D spatial position of the audio source for this sound or group relative to the global listener.
#### pannerAttr `Object`
Sets the panner node's attributes for a sound or group of sounds. See the `pannerAttr` method for all available options.
#### onstereo `Function`
Fires when the current sound has the stereo panning changed. The first parameter is the ID of the sound.
#### onpos `Function`
Fires when the current sound has the listener position changed. The first parameter is the ID of the sound.
#### onorientation `Function`
Fires when the current sound has the direction of the listener changed. The first parameter is the ID of the sound.


### Methods
#### stereo(pan, [id])
Get/set the stereo panning of the audio source for this sound or all in the group.
* **pan**: `Number` A value of `-1.0` is all the way left and `1.0` is all the way right.
* **id**: `Number` `optional` The sound ID. If none is passed, all in group will be updated.

#### pos(x, y, z, [id])
Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
* **x**: `Number` The x-position of the audio source.
* **y**: `Number` The y-position of the audio source.
* **z**: `Number` The z-position of the audio source.
* **id**: `Number` `optional` The sound ID. If none is passed, all in group will be updated.

#### orientation(x, y, z, [id])
Get/set the direction the audio source is pointing in the 3D cartesian coordinate space. Depending on how directional the sound is, based on the `cone` attributes, a sound pointing away from the listener can be quiet or silent.
* **x**: `Number` The x-orientation of the source.
* **y**: `Number` The y-orientation of the source.
* **z**: `Number` The z-orientation of the source.
* **id**: `Number` `optional` The sound ID. If none is passed, all in group will be updated.

#### pannerAttr(o, [id])
Get/set the panner node's attributes for a sound or group of sounds.
* **o**: `Object` All values to update.
  * **coneInnerAngle** `360` A parameter for directional audio sources, this is an angle, in degrees, inside of which there will be no volume reduction.
  * **coneOuterAngle** `360` A parameter for directional audio sources, this is an angle, in degrees, outside of which the volume will be reduced to a constant value of `coneOuterGain`.
  * **coneOuterGain** `0` A parameter for directional audio sources, this is the gain outside of the `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
  * **distanceModel** `inverse` Determines algorithm used to reduce volume as audio moves away from listener. Can be `linear`, `inverse` or `exponential. You can find the implementations of each in the [spec](https://webaudio.github.io/web-audio-api/#idl-def-DistanceModelType).
  * **maxDistance** `10000` The maximum distance between source and listener, after which the volume will not be reduced any further.
  * **refDistance** `1` A reference distance for reducing volume as source moves further from the listener. This is simply a variable of the distance model and has a different effect depending on which model is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
  * **rolloffFactor** `1` How quickly the volume reduces as source moves from listener. This is simply a variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]` with `inverse` and `exponential`.
  * **panningModel** `HRTF` Determines which spatialization algorithm is used to position audio. Can be `HRTF` or `equalpower`.
* **id**: `Number` `optional` The sound ID. If none is passed, all in group will be updated.


### Global Methods
#### stereo(pan)
Helper method to update the stereo panning position of all current `Howls`. Future `Howls` will not use this value unless explicitly set.
* **pan**: `Number` A value of -1.0 is all the way left and 1.0 is all the way right.

#### pos(x, y, z)
Get/set the position of the listener in 3D cartesian space. Sounds using 3D position will be relative to the listener's position.
* **x**: `Number` The x-position of the listener.
* **y**: `Number` The y-position of the listener.
* **z**: `Number` The z-position of the listener.

#### orientation(x, y, z, xUp, yUp, zUp)
Get/set the direction the listener is pointing in the 3D cartesian space. A front and up vector must be provided. The front is the direction the face of the listener is pointing, and up is the direction the top of the listener is pointing. Thus, these values are expected to be at right angles from each other.
* **x**: `Number` The x-orientation of listener.
* **y**: `Number` The y-orientation of listener.
* **z**: `Number` The z-orientation of listener.
* **xUp**: `Number` The x-orientation of the top of the listener.
* **yUp**: `Number` The y-orientation of the top of the listener.
* **zUp**: `Number` The z-orientation of the top of the listener.


### Mobile/Chrome Playback
By default, audio on mobile browsers and Chrome is locked until a sound is played within a user interaction, and then it plays normally the rest of the page session ([Apple documentation](https://developer.apple.com/library/safari/documentation/audiovideo/conceptual/using_html5_audio_video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html)). The default behavior of howler.js is to attempt to silently unlock audio playback by playing an empty buffer on the first `touchend` event. This behavior can be disabled by calling:

```javascript
Howler.mobileAutoEnable = false;
```

If you try to play audio automatically on page load, you can listen to a `playerror` event and then wait for the `unlock` event to try and play the audio again:

```javascript
var sound = new Howl({
  src: ['sound.webm', 'sound.mp3'],
  onplayerror: function() {
    sound.once('unlock', function() {
      sound.play();
    });
  }
});

sound.play();
```


### Dolby Audio Playback
Full support for playback of the Dolby Audio format (currently support in Edge and Safari) is included. However, you must specify that the file you are loading is `dolby` since it is in a `mp4` container.

```javascript
var dolbySound = new Howl({
  src: ['sound.mp4', 'sound.webm', 'sound.mp3'],
  format: ['dolby', 'webm', 'mp3']
});
```

### Facebook Instant Games
Howler.js provides audio support for the new [Facebook Instant Games](https://developers.facebook.com/docs/games/instant-games/engine-recommendations) platform. If you encounter any issues while developing for Instant Games, open an issue with the tag `[IG]`.

### Format Recommendations
Howler.js supports a wide array of audio codecs that have varying browser support ("mp3", "opus", "ogg", "wav", "aac", "m4a", "mp4", "webm", ...), but if you want full browser coverage you still need to use at least two of them. If your goal is to have the best balance of small filesize and high quality, based on extensive production testing, your best bet is to default to `webm` and fallback to `mp3`. `webm` has nearly full browser coverage with a great combination of compression and quality. You'll need the `mp3` fallback for Internet Explorer.

It is important to remember that howler.js selects the first compatible sound from your array of sources. So if you want `webm` to be used before `mp3`, you need to put the sources in that order.

If you want your `webm` files to be seekable in Firefox, be sure to encode them with the cues element. One way to do this is by using the `dash` flag in [ffmpeg](https://www.ffmpeg.org/):

```
ffmpeg -i sound1.wav -dash 1 sound1.webm
```

### License

Copyright (c) 2013-2018 [James Simpson](https://twitter.com/GoldFireStudios) and [GoldFire Studios, Inc.](http://goldfirestudios.com)

Released under the [MIT License](https://github.com/goldfire/howler.js/blob/master/LICENSE.md).
