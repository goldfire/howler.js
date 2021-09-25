import Howler from './howler';

const cache = {};

/**
 * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
 * @param  {Howl} self
 */
export function loadBuffer(self) {
  var url = self._src;

  // Check if the buffer has already been cached and use it instead.
  if (cache[url]) {
    // Set the duration from the cache.
    self._duration = cache[url].duration;

    // Load the sound into this Howl.
    loadSound(self);

    return;
  }

  if (/^data:[^;]+;base64,/.test(url)) {
    // Decode the base64 data URI without XHR, since some browsers don't support it.
    var data = atob(url.split(',')[1]);
    var dataView = new Uint8Array(data.length);
    for (var i = 0; i < data.length; ++i) {
      dataView[i] = data.charCodeAt(i);
    }

    decodeAudioData(dataView.buffer, self);
  } else {
    // Load the buffer from the URL.
    var xhr = new XMLHttpRequest();
    xhr.open(self._xhr.method, url, true);
    xhr.withCredentials = self._xhr.withCredentials;
    xhr.responseType = 'arraybuffer';

    // Apply any custom headers to the request.
    if (self._xhr.headers) {
      Object.keys(self._xhr.headers).forEach(function (key) {
        xhr.setRequestHeader(key, self._xhr.headers[key]);
      });
    }

    xhr.onload = function () {
      // Make sure we get a successful response back.
      var code = (xhr.status + '')[0];
      if (code !== '0' && code !== '2' && code !== '3') {
        self._emit(
          'loaderror',
          null,
          'Failed loading audio file with status: ' + xhr.status + '.',
        );
        return;
      }

      decodeAudioData(xhr.response, self);
    };
    xhr.onerror = function () {
      // If there is an error, switch to HTML5 Audio.
      if (self._webAudio) {
        self._html5 = true;
        self._webAudio = false;
        self._sounds = [];
        delete cache[url];
        self.load();
      }
    };
    safeXhrSend(xhr);
  }
}

/**
 * Send the XHR request wrapped in a try/catch.
 * @param  {Object} xhr XHR to send.
 */
function safeXhrSend(xhr) {
  try {
    xhr.send();
  } catch (e) {
    xhr.onerror();
  }
}

/**
 * Decode audio data from an array buffer.
 * @param  {ArrayBuffer} arraybuffer The audio data.
 * @param  {Howl}        self
 */
function decodeAudioData(arraybuffer, self) {
  // Fire a load error if something broke.
  var error = function () {
    self._emit('loaderror', null, 'Decoding audio data failed.');
  };

  // Load the sound on success.
  var success = function (buffer) {
    if (buffer && self._sounds.length > 0) {
      cache[self._src] = buffer;
      loadSound(self, buffer);
    } else {
      error();
    }
  };

  // Decode the buffer into an audio source.
  if (
    typeof Promise !== 'undefined' &&
    Howler.ctx.decodeAudioData.length === 1
  ) {
    Howler.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
  } else {
    Howler.ctx.decodeAudioData(arraybuffer, success, error);
  }
}

/**
 * Sound is now loaded, so finish setting everything up and fire the loaded event.
 * @param  {Howl} self
 * @param  {Object} buffer The decoded buffer sound source.
 */
function loadSound(self, buffer) {
  // Set the duration.
  if (buffer && !self._duration) {
    self._duration = buffer.duration;
  }

  // Setup a sprite if none is defined.
  if (Object.keys(self._sprite).length === 0) {
    self._sprite = { __default: [0, self._duration * 1000] };
  }

  // Fire the loaded event.
  if (self._state !== 'loaded') {
    self._state = 'loaded';
    self._emit('load');
    self._loadQueue();
  }
}

/**
 * Setup the audio context when available, or switch to HTML5 Audio mode.
 */
export function setupAudioContext() {
  // If we have already detected that Web Audio isn't supported, don't run this step again.
  if (!Howler.usingWebAudio) {
    return;
  }

  // Check if we are using Web Audio and setup the AudioContext if we are.
  try {
    if (typeof AudioContext !== 'undefined') {
      Howler.ctx = new AudioContext();
    } else if (typeof webkitAudioContext !== 'undefined') {
      Howler.ctx = new webkitAudioContext();
    } else {
      Howler.usingWebAudio = false;
    }
  } catch (e) {
    Howler.usingWebAudio = false;
  }

  // If the audio context creation still failed, set using web audio to false.
  if (!Howler.ctx) {
    Howler.usingWebAudio = false;
  }

  // Check if a webview is being used on iOS8 or earlier (rather than the browser).
  // If it is, disable Web Audio as it causes crashing.
  var iOS = /iP(hone|od|ad)/.test(
    Howler._navigator && Howler._navigator.platform,
  );
  var appVersion =
    Howler._navigator &&
    Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
  var version = appVersion ? parseInt(appVersion[1], 10) : null;
  if (iOS && version && version < 9) {
    var safari = /safari/.test(
      Howler._navigator && Howler._navigator.userAgent.toLowerCase(),
    );
    if (Howler._navigator && !safari) {
      Howler.usingWebAudio = false;
    }
  }

  // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
  if (Howler.usingWebAudio) {
    Howler.masterGain =
      typeof Howler.ctx.createGain === 'undefined'
        ? Howler.ctx.createGainNode()
        : Howler.ctx.createGain();
    Howler.masterGain.gain.setValueAtTime(
      Howler._muted ? 0 : Howler._volume,
      Howler.ctx.currentTime,
    );
    Howler.masterGain.connect(Howler.ctx.destination);
  }

  // Re-run the setup on Howler.
  Howler._setup();
}
