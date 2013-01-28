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
* Methods can be chained
* Uses no outside libraries, just pure Javascript
* Lightweight, 5kb filesize

### Browser Compatibility
Tested in the following browsers/versions:
* Google Chrome 4.0+
* Internet Explorer 9.0+
* Firefox 3.5+
* Safari 4.0+
* Mobile Safari 6.0+ (after user input)
* Operat 10.5+

## Documentation

### Examples

##### Most basic, play an MP3:
```javascript
var sound = new Howl({
  urls: ['sound.mp3']
}).play();
```

##### More playback options:
```javascript
var sound = new Howl({
  urls: ['sound.mp3', 'sound.ogg', 'sound.wav'],
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
  urls: ['sounds.mp3', 'sounds.ogg'],
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
* **autoplay**: `Boolean` *(`true` by default)* Set to `true` to automatically start playback when sound is loaded.
* **loop**: `Boolean` *(`false` by default)* Set to `true` to automatically loop the sound forever.
* **sprite**: `Object` *(`{}` by default)* Define a sound sprite for the sound. The offset and duration are defined in milliseconds.
```
Example:
{
  key: [offset, duration]
}
```
* **pos**: `Number` *(`0` by default)* Position to start playback from in milliseconds.
* **volume**: `Number` *(`1.0` by default)* The volume of the specific track, from `0.0` to `1.0`.
* **urls**: `Array` *(`[]` by default)* The source URLs to the track(s) to be loaded for the sound. These should be in order of preference, howler.js will automatically load the first one that is compatible with the current browser.
* **onend**: `Function` *(`function(){}` by default)* Fire when the sound finishes playing (if it is looping, it'll fire at the end of each loop).
* **onload**: `Function` *(`function(){}` by default)* Fires when the sound is loaded.
* **onpause**: `Function` *(`function(){}` by default)* Fires when the sound has been paused.

### Methods
* **play**: Begins playback of sound. Will continue from previous point if sound has been previously paused.
  * *sprite*: `String` (optional) Plays from the defined sprite key.
* **pause**: Pauses playback of sound, saving the `pos` of playback.
* **stop**: Stops playback of sound, resetting `pos` to `0`.
* **mute**: Mutes the sound, but doesn't pause the playback.
* **unmute**: Unmutes the sound.
* **fadeIn**: Fade in the current sound.
  * *to*: `Number` Volume to fade to (`0.0` to `1.0`).
  * *duration*: `Number` Time in milliseconds to fade.
  * *callback*: `Function` (optional) Fires when fade is complete.
* **fadeOut**: Fade out the current sound and pause when finished.
  * *to*: `Number` Volume to fade to (`0.0` to `1.0`).
  * *duration*: `Number` Time in milliseconds to fade.
  * *callback*: `Function` (optional) Fires when fade is complete.
* **loop**: Get/set whether to loop the sound.
  * *loop*: `Boolean` (optional) To loop or not to loop, that is the question.
* **pos**: Get/set the position of playback.
  * *position*: `Number` (optional) The position to move current playback to.
* **sprite**: Get/set sound sprite definition.
  * *sprite*: `Object` (optional) See above for sound sprite definition.
* **volume**: Get/set volume of this sound.
  * *volume*: `Number` (optional) Volume from `0.0` to `1.0`.
* **urls**: Get/set the URLs to be pulled from to play in this source.
  * *urls*: `Array` (optional) Changes the source files for this `Howl` object.
* **on**: Call/set custom events.
  * *event*: `String` Name of event to fire/set.
  * *function*: `Function` (optional) Define function to fire on event.

### Global Methods
The following methods are used to modify all sounds globally, and are called from the `Howler` object.

* **mute**: Mutes all sounds.
* **unmute**: Unmutes all sounds and restores them to their previous volume.
* **volume**: Get/set the global volume for all sounds.
  * *volume*: `Number` (optional) Volume from `0.0` to `1.0`.

## License

Copyright (c) 2013 James Simpson and GoldFire Studios, Inc.

Released under the MIT License.