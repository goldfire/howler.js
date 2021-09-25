import Howl from './Howl';

interface HowlerInstance {
  mute(muted: boolean): this;
  stop(): this;
  volume(): number;
  volume(volume: number): this;
  codecs(ext: string): boolean;
  unload(): this;
  usingWebAudio: boolean;
  html5PoolSize: number;
  noAudio: boolean;
  autoUnlock: boolean;
  autoSuspend: boolean;
  ctx: AudioContext;
  masterGain: GainNode;

  stereo(pan: number): this;
  pos(x: number, y: number, z: number): this | void;
  orientation(
    x: number,
    y: number,
    z: number,
    xUp: number,
    yUp: number,
    zUp: number,
  ): this | void;
}

interface HowlerAudioElement extends HTMLAudioElement {
  _unlocked: boolean;
}

type HowlerAudioContextState = AudioContextState | 'suspending' | 'closed';

type HowlerAudioContext = Omit<AudioContext, 'state'> & {
  // In iOS Safari, the state can also be set to 'interrupted'
  // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari
  state: AudioContextState | 'interrupted';
};

// IDEA: Maybe use TS private properties to create clearer contexts.

class Howler {
  // Public properties.
  masterGain: GainNode | null = null;
  noAudio = false;
  usingWebAudio = true;
  autoSuspend = true;
  ctx: HowlerAudioContext | null = null;

  // Set to false to disable the auto audio unlocker.
  autoUnlock = true;

  // Create a global ID counter.
  _counter: number = 1000;

  // Pool of unlocked HTML5 Audio objects.
  _html5AudioPool: Array<HTMLAudioElement> = [];
  html5PoolSize: number = 10;

  // Internal properties
  _codecs = {};
  _howls: Array<Howl> = [];
  _muted = false;
  _volume = 1;
  _canPlayEvent = 'canplaythrough';
  _navigator = window.navigator;
  _audioUnlocked: boolean = false;
  _mobileUnloaded: boolean = false;
  // IDEA: Maybe rename to `_state` to indicate that this is an internal property?
  state: HowlerAudioContextState = 'suspended';
  _suspendTimer: number | null = null;
  _resumeAfterSuspend?: boolean;

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  constructor() {
    // Setup the various state values for global tracking.
    this._setup();
  }

  /**
   * Get/set the global volume for all sounds.
   * @param  {Float} vol Volume from 0.0 to 1.0.
   * @return {Howler/Float}     Returns self or current volume.
   */
  volume(vol: string) {
    const volume = parseFloat(vol);

    // If we don't have an AudioContext created yet, run the setup.
    if (!this.ctx) {
      this._setupAudioContext();
    }

    if (typeof volume !== 'undefined' && volume >= 0 && volume <= 1) {
      this._volume = volume;

      // Don't update any of the nodes if we are muted.
      if (this._muted) {
        return this;
      }

      // When using Web Audio, we just need to adjust the master gain.
      if (this.usingWebAudio) {
        this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
      }

      // Loop through and change volume for all HTML5 audio nodes.
      for (var i = 0; i < this._howls.length; i++) {
        if (!this._howls[i]._webAudio) {
          // Get all of the sounds in this Howl group.
          var ids = this._howls[i]._getSoundIds();

          // Loop through all sounds and change the volumes.
          for (var j = 0; j < ids.length; j++) {
            var sound = this._howls[i]._soundById(ids[j]);

            if (sound && sound._node) {
              sound._node.volume = sound._volume * volume;
            }
          }
        }
      }

      return volume;
    }

    return this._volume;
  }

  /**
   * Handle muting and unmuting globally.
   * @param  {Boolean} muted Is muted or not.
   */
  mute(muted) {
    // If we don't have an AudioContext created yet, run the setup.
    if (!this.ctx) {
      this._setupAudioContext();
    }

    this._muted = muted;

    // With Web Audio, we just need to mute the master gain.
    if (this.usingWebAudio) {
      this.masterGain.gain.setValueAtTime(
        muted ? 0 : this._volume,
        Howler.ctx.currentTime,
      );
    }

    // Loop through and mute all HTML5 Audio nodes.
    for (var i = 0; i < this._howls.length; i++) {
      if (!this._howls[i]._webAudio) {
        // Get all of the sounds in this Howl group.
        var ids = this._howls[i]._getSoundIds();

        // Loop through all sounds and mark the audio node as muted.
        for (var j = 0; j < ids.length; j++) {
          var sound = this._howls[i]._soundById(ids[j]);

          if (sound && sound._node) {
            sound._node.muted = muted ? true : sound._muted;
          }
        }
      }
    }

    return this;
  }

  /**
   * Handle stopping all sounds globally.
   */
  stop() {
    // Loop through all Howls and stop them.
    for (var i = 0; i < this._howls.length; i++) {
      this._howls[i].stop();
    }

    return this;
  }

  /**
   * Unload and destroy all currently loaded Howl objects.
   * @return {Howler}
   */
  unload() {
    for (var i = this._howls.length - 1; i >= 0; i--) {
      this._howls[i].unload();
    }

    // Create a new AudioContext to make sure it is fully reset.
    if (
      this.usingWebAudio &&
      this.ctx &&
      typeof this.ctx.close !== 'undefined'
    ) {
      this.ctx.close();
      this.ctx = null;
      this._setupAudioContext();
    }

    return this;
  }

  /**
   * Check for codec support of specific extension.
   * @param  {String} ext Audio file extention.
   * @return {Boolean}
   */
  codecs(ext) {
    return this._codecs[ext.replace(/^x-/, '')];
  }

  /**
   * Setup various state values for global tracking.
   * @return {Howler}
   */
  _setup() {
    // Keeps track of the suspend/resume state of the AudioContext.
    this.state = this.ctx ? this.ctx.state || 'suspended' : 'suspended';

    // Automatically begin the 30-second suspend process
    this._autoSuspend();

    // Check if audio is available.
    if (!this.usingWebAudio) {
      // No audio is available on this system if noAudio is set to true.
      if (typeof Audio !== 'undefined') {
        try {
          var test = new Audio();

          // Check if the canplaythrough event is available.
          if (typeof test.oncanplaythrough === 'undefined') {
            this._canPlayEvent = 'canplay';
          }
        } catch (e) {
          this.noAudio = true;
        }
      } else {
        this.noAudio = true;
      }
    }

    // Test to make sure audio isn't disabled in Internet Explorer.
    try {
      var test = new Audio();
      if (test.muted) {
        this.noAudio = true;
      }
    } catch (e) {}

    // Check for supported codecs.
    if (!this.noAudio) {
      this._setupCodecs();
    }

    return this;
  }

  /**
   * Setup the audio context when available, or switch to HTML5 Audio mode.
   */
  _setupAudioContext() {
    // If we have already detected that Web Audio isn't supported, don't run this step again.
    if (!this.usingWebAudio) {
      return;
    }

    // Check if we are using Web Audio and setup the AudioContext if we are.
    try {
      if (typeof AudioContext !== 'undefined') {
        this.ctx = new AudioContext();
        // @ts-expect-error Safari backwards compatibility
      } else if (typeof webkitAudioContext !== 'undefined') {
        // @ts-expect-error Safari backwards compatibility
        this.ctx = new webkitAudioContext();
      } else {
        this.usingWebAudio = false;
      }
    } catch (e) {
      this.usingWebAudio = false;
    }

    // If the audio context creation still failed, set using web audio to false.
    if (!this.ctx) {
      this.usingWebAudio = false;
    }

    // Check if a webview is being used on iOS8 or earlier (rather than the browser).
    // If it is, disable Web Audio as it causes crashing.
    var iOS = /iP(hone|od|ad)/.test(
      this._navigator && this._navigator.platform,
    );
    var appVersion =
      this._navigator &&
      this._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
    var version = appVersion ? parseInt(appVersion[1], 10) : null;
    if (iOS && version && version < 9) {
      var safari = /safari/.test(
        this._navigator && this._navigator.userAgent.toLowerCase(),
      );
      if (this._navigator && !safari) {
        this.usingWebAudio = false;
      }
    }

    // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
    if (this.usingWebAudio) {
      this.masterGain =
        typeof this.ctx.createGain === 'undefined'
          ? // @ts-expect-error Support old browsers
            this.ctx.createGainNode()
          : this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this._muted ? 0 : this._volume,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.ctx.destination);
    }

    // Re-run the setup on Howler.
    this._setup();
  }

  /**
   * Check for browser support for various codecs and cache the results.
   * @return {Howler}
   */
  _setupCodecs() {
    var audioTest: HTMLAudioElement | null = null;

    // Must wrap in a try/catch because IE11 in server mode throws an error.
    try {
      audioTest = typeof Audio !== 'undefined' ? new Audio() : null;
    } catch (err) {
      return this;
    }

    if (!audioTest || typeof audioTest.canPlayType !== 'function') {
      return this;
    }

    var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

    // Opera version <33 has mixed MP3 support, so we need to check for and block it.
    var ua = this._navigator ? this._navigator.userAgent : '';
    var checkOpera = ua.match(/OPR\/([0-6].)/g);
    var isOldOpera =
      checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33;
    var checkSafari =
      ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1;
    var safariVersion = ua.match(/Version\/(.*?) /);
    var isOldSafari =
      checkSafari && safariVersion && parseInt(safariVersion[1], 10) < 15;

    this._codecs = {
      mp3: !!(
        !isOldOpera &&
        (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))
      ),
      mpeg: !!mpegTest,
      opus: !!audioTest
        .canPlayType('audio/ogg; codecs="opus"')
        .replace(/^no$/, ''),
      ogg: !!audioTest
        .canPlayType('audio/ogg; codecs="vorbis"')
        .replace(/^no$/, ''),
      oga: !!audioTest
        .canPlayType('audio/ogg; codecs="vorbis"')
        .replace(/^no$/, ''),
      wav: !!(
        audioTest.canPlayType('audio/wav; codecs="1"') ||
        audioTest.canPlayType('audio/wav')
      ).replace(/^no$/, ''),
      aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
      caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
      m4a: !!(
        audioTest.canPlayType('audio/x-m4a;') ||
        audioTest.canPlayType('audio/m4a;') ||
        audioTest.canPlayType('audio/aac;')
      ).replace(/^no$/, ''),
      m4b: !!(
        audioTest.canPlayType('audio/x-m4b;') ||
        audioTest.canPlayType('audio/m4b;') ||
        audioTest.canPlayType('audio/aac;')
      ).replace(/^no$/, ''),
      mp4: !!(
        audioTest.canPlayType('audio/x-mp4;') ||
        audioTest.canPlayType('audio/mp4;') ||
        audioTest.canPlayType('audio/aac;')
      ).replace(/^no$/, ''),
      weba: !!(
        !isOldSafari &&
        audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
      ),
      webm: !!(
        !isOldSafari &&
        audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
      ),
      dolby: !!audioTest
        .canPlayType('audio/mp4; codecs="ec-3"')
        .replace(/^no$/, ''),
      flac: !!(
        audioTest.canPlayType('audio/x-flac;') ||
        audioTest.canPlayType('audio/flac;')
      ).replace(/^no$/, ''),
    };

    return this;
  }

  /**
   * Some browsers/devices will only allow audio to be played after a user interaction.
   * Attempt to automatically unlock audio on the first user interaction.
   * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
   * @return {Howler}
   */
  _unlockAudio() {
    // Only run this if Web Audio is supported and it hasn't already been unlocked.
    if (this._audioUnlocked || !this.ctx) {
      return;
    }

    this.autoUnlock = false;

    // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
    // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
    // By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
    if (!this._mobileUnloaded && this.ctx.sampleRate !== 44100) {
      this._mobileUnloaded = true;
      this.unload();
    }

    // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
    // http://stackoverflow.com/questions/24119684
    const scratchBuffer = this.ctx.createBuffer(1, 1, 22050);

    // Call this method on touch start to create and play a buffer,
    // then check if the audio actually played to determine if
    // audio has now been unlocked on iOS, Android, etc.
    const unlock = () => {
      // Create a pool of unlocked HTML5 Audio objects that can
      // be used for playing sounds without user interaction. HTML5
      // Audio objects must be individually unlocked, as opposed
      // to the WebAudio API which only needs a single activation.
      // This must occur before WebAudio setup or the source.onended
      // event will not fire.
      while (this._html5AudioPool.length < this.html5PoolSize) {
        try {
          var audioNode = new Audio() as HowlerAudioElement;

          // Mark this Audio object as unlocked to ensure it can get returned
          // to the unlocked pool when released.
          audioNode._unlocked = true;

          // Add the audio node to the pool.
          this._releaseHtml5Audio(audioNode);
        } catch (e) {
          this.noAudio = true;
          break;
        }
      }

      // Loop through any assigned audio nodes and unlock them.
      for (var i = 0; i < this._howls.length; i++) {
        if (!this._howls[i]._webAudio) {
          // Get all of the sounds in this Howl group.
          var ids = this._howls[i]._getSoundIds();

          // Loop through all sounds and unlock the audio nodes.
          for (var j = 0; j < ids.length; j++) {
            var sound = this._howls[i]._soundById(ids[j]);

            if (sound && sound._node && !sound._node._unlocked) {
              sound._node._unlocked = true;
              sound._node.load();
            }
          }
        }
      }

      // Fix Android can not play in suspend state.
      this._autoResume();

      // Create an empty buffer.
      var source = this.ctx.createBufferSource();
      source.buffer = scratchBuffer;
      source.connect(this.ctx.destination);

      // Play the empty buffer.
      if (typeof source.start === 'undefined') {
        // @ts-expect-error .noteOn() only exists in old browsers.
        source.noteOn(0);
      } else {
        source.start(0);
      }

      // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
      if (typeof this.ctx.resume === 'function') {
        this.ctx.resume();
      }

      // Setup a timeout to check that we are unlocked on the next event loop.
      source.onended = () => {
        source.disconnect(0);

        // Update the unlocked state and prevent this check from happening again.
        this._audioUnlocked = true;

        // Remove the touch start listener.
        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('touchend', unlock, true);
        document.removeEventListener('click', unlock, true);
        document.removeEventListener('keydown', unlock, true);

        // Let all sounds know that audio has been unlocked.
        for (var i = 0; i < this._howls.length; i++) {
          this._howls[i]._emit('unlock');
        }
      };
    };

    // Setup a touch start listener to attempt an unlock in.
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('click', unlock, true);
    document.addEventListener('keydown', unlock, true);

    return this;
  }

  /**
   * Get an unlocked HTML5 Audio object from the pool. If none are left,
   * return a new Audio object and throw a warning.
   * @return {Audio} HTML5 Audio object.
   */
  _obtainHtml5Audio() {
    // Return the next object from the pool if one exists.
    if (this._html5AudioPool.length) {
      return this._html5AudioPool.pop();
    }

    // Check if the audio is locked and throw a warning.
    var testPlay = new Audio().play();
    if (
      testPlay &&
      typeof Promise !== 'undefined' &&
      // @ts-expect-error
      (testPlay instanceof Promise || typeof testPlay.then === 'function')
    ) {
      testPlay.catch(function () {
        console.warn(
          'HTML5 Audio pool exhausted, returning potentially locked audio object.',
        );
      });
    }

    return new Audio();
  }

  /**
   * Return an activated HTML5 Audio object to the pool.
   * @return {Howler}
   */
  _releaseHtml5Audio(audio: HowlerAudioElement) {
    // Don't add audio to the pool if we don't know if it has been unlocked.
    if (audio._unlocked) {
      this._html5AudioPool.push(audio);
    }

    return this;
  }

  /**
   * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
   * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
   * @return {Howler}
   */
  _autoSuspend() {
    if (
      !this.autoSuspend ||
      !this.ctx ||
      typeof this.ctx.suspend === 'undefined' ||
      !this.usingWebAudio
    ) {
      return;
    }

    // Check if any sounds are playing.
    for (var i = 0; i < this._howls.length; i++) {
      if (this._howls[i]._webAudio) {
        for (var j = 0; j < this._howls[i]._sounds.length; j++) {
          if (!this._howls[i]._sounds[j]._paused) {
            return this;
          }
        }
      }
    }

    if (this._suspendTimer) {
      clearTimeout(this._suspendTimer);
    }

    // If no sound has played after 30 seconds, suspend the context.
    this._suspendTimer = setTimeout(() => {
      if (!this.autoSuspend) {
        return;
      }

      this._suspendTimer = null;
      this.state = 'suspending';

      // Handle updating the state of the audio context after suspending.
      const handleSuspension = () => {
        this.state = 'suspended';

        if (this._resumeAfterSuspend) {
          delete this._resumeAfterSuspend;
          this._autoResume();
        }
      };

      // Either the state gets suspended or it is interrupted.
      // Either way, we need to update the state to suspended.
      this.ctx.suspend().then(handleSuspension, handleSuspension);
    }, 30000);

    return this;
  }

  /**
   * Automatically resume the Web Audio AudioContext when a new sound is played.
   * @return {Howler}
   */
  _autoResume() {
    if (
      !this.ctx ||
      typeof this.ctx.resume === 'undefined' ||
      !this.usingWebAudio
    ) {
      return;
    }

    if (
      this.state === 'running' &&
      this.ctx.state !== 'interrupted' &&
      this._suspendTimer
    ) {
      clearTimeout(this._suspendTimer);
      this._suspendTimer = null;
    } else if (
      this.state === 'suspended' ||
      (this.state === 'running' && this.ctx.state === 'interrupted')
    ) {
      this.ctx.resume().then(() => {
        this.state = 'running';

        // Emit to all Howls that the audio has resumed.
        for (var i = 0; i < this._howls.length; i++) {
          this._howls[i]._emit('resume');
        }
      });

      if (this._suspendTimer) {
        clearTimeout(this._suspendTimer);
        this._suspendTimer = null;
      }
    } else if (this.state === 'suspending') {
      this._resumeAfterSuspend = true;
    }

    return this;
  }
}

export default new Howler();
