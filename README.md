![howler.js](http://goldfirestudios.com/proj/howlerjs/howlerjs_logo.png "howler.js")

## Description
[**howler.js**](http://howlerjs.com) is an audio library for the modern web. It defaults to [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) and falls back to [HTML5 Audio](http://www.whatwg.org/specs/web-apps/current-work/#the-audio-element).

More documentation, examples and demos can be found at **[howlerjs.com](http://howlerjs.com)**.

### Features
* Defaults to Web Audio API
* Falls back to HTML5 Audio
* Supports multiple file formats to support all browsers
* Automatic caching for Web Audio API
* Implements cache pool for HTML5 Audio
* Per-sound and global mute/unmute and volume control
* Playback of multiple sounds at the same time
* Easy sound sprite definition and playback
* Fade in/out sounds
* Supports Web Audio 3D sound positioning
* Methods can be chained
* Uses no outside libraries, just pure Javascript
* Lightweight, 9kb filesize (3kb gzipped)

### Browser Compatibility
Tested in the following browsers/versions:
* Google Chrome 7.0+
* Internet Explorer 9.0+
* Firefox 4.0+
* Safari 5.1.4+
* Mobile Safari 6.0+ (after user input)
* Opera 12.0+

## Documentation

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
  src: ['sound.mp3', 'sound.ogg', 'sound.wav'],
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
  src: ['sounds.mp3', 'sounds.ogg'],
  sprite: {
    blast: [0, 1000],
    laser: [2000, 3000],
    winner: [4000, 7500]
  }
});

// shoot the laser!
sound.play('laser');
```

### Properties
* **src**: `Array` *(`[]` by default)* The sources to the track(s) to be loaded for the sound (URLs or base64 data URIs). These should be in order of preference, howler.js will automatically load the first one that is compatible with the current browser. If your files have no extensions, you will need to explicitly specify the extension using the `ext` property.
* **volume**: `Number` *(`1.0` by default)* The volume of the specific track, from `0.0` to `1.0`.
* **html5**: `Boolean` *(`false` by default)* Set to `true` to force HTML5 Audio. This should be used for large audio files so that you don't have to wait for the full file to be downloaded and decoded before playing.
* **loop**: `Boolean` *(`false` by default)* Set to `true` to automatically loop the sound forever.
* **preload**: `Boolean` *(`true` by default)* Automatically begin downloading the audio file when the `Howl` is defined.
* **autoplay**: `Boolean` *(`false` by default)* Set to `true` to automatically start playback when sound is loaded.
* **sprite**: `Object` *(`{}` by default)* Define a sound sprite for the sound. The offset and duration are defined in milliseconds. A third (optional) parameter is available to set a sprite as looping.
```
Example:
{
  key: [offset, duration, (loop)]
}
```
* **rate**: `Number` *(`1.0` by default)* The rate of playback. 0.5 to 4.0, with 1.0 being normal speed.
* **pool**: `Number` *(`5` by default)* The size of the inactive sounds pool. Once sounds are stopped or finish playing, they are marked as ended and ready for cleanup. We keep a pool of these to recycle for improved performance. Generally this doesn't need to be changed. It is important to keep in mind that when a sound is paused, it won't be removed from the pool and will still be considered active so that it can be resumed later.
* **ext**: `Array` *(`[]` by default)* howler.js automatically detects your file format from the extension, but you may also specify a format in situations where extraction won't work.
* **onload**: `Function` Fires when the sound is loaded.
* **onloaderror**: `Function` Fires when the sound is unable to load.
* **onplay**: `Function` Fires when the sound begins playing. The first parameter is the ID of the sound.
* **onend**: `Function` Fires when the sound finishes playing (if it is looping, it'll fire at the end of each loop). The first parameter is the ID of the sound.
* **onpause**: `Function` Fires when the sound has been paused. The first parameter is the ID of the sound.
* **onfaded**: `Function` Fires when the current sound finishes fading in/out. The first parameter is the ID of the sound.

### Methods
* **play**: Begins playback of a sound. Returns the sound id to be used with other methods. Only method that can't be chained.
  * *sprite/id*: `String/Number` (optional) The `play` method takes one parameter that can either be a sprite ID or a sound ID. If a sprite is passed, a new sound will play based on the sprite's definition. If a sound ID is passed, the previously played sound will be played (for example after puasing it). However, if an ID of a sound that has been drained from the pool is passed, nothing will play.
* **pause**: Pauses playback of sound or group, saving the `pos` of playback.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds in group are puased.
* **stop**: Stops playback of sound, resetting `pos` to `0`.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds in group are stopped.
* **mute**: Mutes the sound, but doesn't pause the playback.
  * *muted*: `Boolean` True to mute and false to unmute.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds in group are stopped.
* **volume**: Get/set volume of this sound or the group. This method optionally takes 0, 1 or 2 arguments.
  * *volume*: `Number` (optional) Volume from `0.0` to `1.0`.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds in group have volume altered relative to their own volume.
* **fade**: Fade a currently playing sound between two volumes. Fires the `faded` event when complete.
  * *from*: `Number` Volume to fade from (`0.0` to `1.0`).
  * *to*: `Number` Volume to fade to (`0.0` to `1.0`).
  * *duration*: `Number` Time in milliseconds to fade.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds ing roup will fade.
* **seek**: Get/set the position of playback for a sound. This method optionally takes 0, 1 or 2 arguments.
  * *position*: `Number` (optional) The position to move current playback to (in seconds).
  * *id*: `Number` (optional) The sound ID. If none is passed, the first sound will seek.
* **loop**: Get/set whether to loop the sound or group. This method can optionally take 0, 1 or 2 arguments.
  * *loop*: `Boolean` (optional) To loop or not to loop, that is the question.
  * *id*: `Number` (optional) The sound ID. If none is passed, all sounds in group will have their `loop` property updated.
* **playing**: Check if a sound is currently playing or not, returns a `Boolean`.
  * *id*: `Number` The sound ID to check.
* **on**: Listen for events. Multiple events can be added by calling this multiple times.
  * *event*: `String` Name of event to fire/set.
  * *function*: `Function` (optional) Define function to fire on event.
* **once**: Same as `on`, but it removes itself after the callback is fired.
  * *event*: `String` Name of event to fire/set.
  * *function*: `Function` (optional) Define function to fire on event.
* **off**: Remove event listener that you've set.
  * *event*: `String` Name of event.
  * *function*: `Function` (optional) The listener to remove.
* **load**: This is called by default, but if you set `preload` to false, you must call `load` before you can play any sounds.
* **unload**: Unload and destroy a Howl object. This will immediately stop all sounds attached to this sound and remove it from the cache.

### Global Methods
The following methods are used to modify all sounds globally, and are called from the `Howler` object.

* **mute**: Mute or unmute all sounds.
  * *muted*: `Boolean` True to mute and false to unmute.
* **volume**: Get/set the global volume for all sounds, relative to their own volume.
  * *volume*: `Number` (optional) Volume from `0.0` to `1.0`.
* **codecs**: Check supported audio codecs.
  * *ext*: `String` File extension. One of: "mp3", "opus", "ogg", "wav", "aac", "m4a", "mp4", "weba".

### Global Properties
* **usingWebAudio**: `Boolean` *(no default, auto detection)* `true` if the Web Audio API is available.
* **noAudio**: `Boolean` *(no default, auto detection)* `true` if any audio is available.
* **iOSAutoEnable**: `Boolean` *(`true` by default)* Automatically attempts to enable audio on iOS devices.
* **ctx**: `Boolean` *(Web Audio only)* Exposes the `AudioContext` with Web Audio API.

### Effects Plugin Methods
* **pos**: Get/set the 3D spatial position of the audio source for this sound or group. The most common usage is to set the `x` position for left/right panning. Setting any value higher than `1.0` will begin to decrease the volume of the sound as it moves further away.
  * *x*: `Number` The x-position of the audio from -1000.0 to 1000.0.
  * *y*: `Number` The y-position of the audio from -1000.0 to 1000.0.
  * *z*: `Number` The z-position of the audio from -1000.0 to 1000.0.
  * *id*: `Number` (optional) The sound ID. If none is passed, all in group will be updated.
* **orientation**: Get/set the direction the audio source is pointing in the 3D cartesian coordinate space. Depending on how direction the sound is, based on the `cone` attributes, a sound pointing away from the listener can be quiet or silent.
  * *x*: `Number` The x-orientation of the source.
  * *y*: `Number` The y-orientation of the source.
  * *z*: `Number` The z-orientation of the source.
  * *id*: `Number` (optional) The sound ID. If none is passed, all in group will be updated.
* **velocity**: Get/set the velocity vector of the audio source or group. This controls both direction and speed in 3D space and is relative to the listener's velocity. The units are meters/second and are independent of position and orientation.
  * *x*: `Number` The x-velocity of the source.
  * *y*: `Number` The y-velocity of the source.
  * *z*: `Number` The z-velocity of the source.
  * *id*: `Number` (optional) The sound ID. If none is passed, all in group will be updated.
* **pannerAttr**: Get/set the panner node's attributes for a sound or group of sounds. This method can optionall take 0, 1 or 2 arguments.
  * *o*: `Object` All values to update.
    * `coneInnerAngle` (`360` by default) There will be no volume reduction inside this angle.
    * `coneOUterAngle` (`360` by default) The volume will be reduced to a constant value of `coneOuterGain` outside this angle.
    * `coneOuterGain` (`0` by default) The amount of volume reduction outside of `coneOuterAngle`.
    * `distanceModel` (`inverse` by default) Determines algorithm to use to reduce volume as audio moves away from listener. Can be `linear`, `inverse` or `exponential.
    * `maxDistance` (`10000` by default) Volume won't reduce between source/listener beyond this distance.
    * `panningModel` (`HRTF` by default) Determines which spatialization algorithm is used to position audio. Can be `HRTF` or `equalpower`.
    * `refDistance` (`1` by default) A reference distance for reducing volume as the source moves away from the listener.
    * `rolloffFactor` (`1` by default) How quickly the volume reduces as source moves from listener.
  * *id*: `Number` (optional) The sound ID. If none is passed, all in group will be updated.

### Effects Plugin Properties
* **orientation**: `Array` *(`[1, 0, 0]` by default)* Sets the direction the audio source is pointing in the 3D cartesian coordinate space. Depending on how direction the sound is, based on the `cone` attributes, a sound pointing away from the listener can be quiet or silent.
* **pos**: `Array` *('null' by default)* Sets the 3D spatial position of the audio source for this sound or group. The most common usage is to set the `x` position for left/right panning. Setting any value higher than `1.0` will begin to decrease the volume of the sound as it moves further away.
* **velocity**: `Array` *(`[0, 0, 0]` by default)* Sets the velocity vector of the audio source or group. This controls both direction and speed in 3D space and is relative to the listener's velocity. The units are meters/second and are independent of position and orientation.
* **pannerAttr**: `Object` *(see `pannerAttr` method for defaults)* Sets the panner node's attributes for a sound or group of sounds.

### iOS Playback
By default, audio on iOS is locked until a sound is played within a user interaction, and then it plays normally the rest of the page session ([Apple documentation](https://developer.apple.com/library/safari/documentation/audiovideo/conceptual/using_html5_audio_video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html)). The default behavior of howler.js is to attempt to silently unlock audio playback by playing an empty buffer on the first `touchstart` event. This behavior can be disabled by calling:

```javascript
Howler.iOSAutoEnable = false;
```

### Format Recommendations
Howler.js supports a wide array of audio codecs that have varying browser support ("mp3", "opus", "ogg", "wav", "aac", "m4a", "mp4", "weba", ...), but if you want full browser coverage you still need to use at least two of them. If your goal is to have the best balance of small filesize and high quality, based on extensive production testing, your best bet is to default to `ogg/webm` and fallback to `mp3`. Both `ogg` and `webm` have nearly full browser coverage with a great combination of compression and quality. You'll need the `mp3` fallback for Internet Explorer.

It is important to remember that howler.js selects the first compatible sound from your array of sources. So if you want `ogg` or `webm` to be used before `mp3`, you need to put the sources in that order.

### License

Copyright (c) 2013-2014 James Simpson and GoldFire Studios, Inc.

Released under the MIT License.