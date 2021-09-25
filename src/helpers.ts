import Howl from './Howl';
import Howler from './howler';

export const cache = {};

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
function decodeAudioData(arraybuffer: ArrayBuffer, self: Howl) {
  // Fire a load error if something broke.
  function error() {
    self._emit('loaderror', null, 'Decoding audio data failed.');
  }

  // Load the sound on success.
  function success(buffer: AudioBuffer) {
    if (buffer && self._sounds.length > 0) {
      cache[self._src] = buffer;
      loadSound(self, buffer);
    } else {
      error();
    }
  }

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
function loadSound(self: Howl, buffer?: AudioBuffer) {
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

export const isHTMLAudioElement = (node: any): node is HTMLAudioElement =>
  (node as HTMLAudioElement).playbackRate !== undefined;

export const isGainNode = (node: any): node is GainNode =>
  (node as GainNode).connect !== undefined;
