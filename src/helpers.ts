import Howl, { HowlXHROptions } from './Howl';
import Howler from './howler';

export const cache = {};

/**
 * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
 */
export function loadBuffer(self: Howl) {
  var url = self._src as string;

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
    xhr.open((self._xhr as HowlXHROptions).method as string, url, true);
    xhr.withCredentials = (self._xhr as HowlXHROptions)
      .withCredentials as boolean;
    xhr.responseType = 'arraybuffer';

    // Apply any custom headers to the request.
    if (self._xhr as HowlXHROptions) {
      Object.keys(self._xhr as HowlXHROptions).forEach(function (key) {
        xhr.setRequestHeader(key, (self._xhr as HowlXHROptions)[key]);
      });
    }

    xhr.onload = () => {
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
    xhr.onerror = () => {
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
 * @param xhr XHR to send.
 */
function safeXhrSend(xhr: XMLHttpRequest) {
  try {
    xhr.send();
  } catch (e) {
    console.error('XHR Request failed: ', e);
  }
}

/**
 * Decode audio data from an array buffer.
 * @param arraybuffer The audio data.
 * @param self
 */
function decodeAudioData(arraybuffer: ArrayBuffer, self: Howl) {
  // Fire a load error if something broke.
  function error() {
    self._emit('loaderror', null, 'Decoding audio data failed.');
  }

  // Load the sound on success.
  function success(buffer: AudioBuffer) {
    if (buffer && self._sounds.length > 0) {
      cache[self._src as string] = buffer;
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
 * @param self
 * @param buffer The decoded buffer sound source.
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

// NOTE: Maybe remove these
export const isHTMLAudioElement = (node: any): node is HTMLAudioElement =>
  (node as HTMLAudioElement).playbackRate !== undefined;

export const isGainNode = (node: any): node is GainNode =>
  (node as GainNode).connect !== undefined;
