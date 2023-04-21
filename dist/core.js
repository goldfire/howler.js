// src/howler.ts
var Howler = class {
  constructor() {
    this.masterGain = null;
    this.noAudio = false;
    this.usingWebAudio = true;
    this.autoSuspend = true;
    this.ctx = null;
    this.autoUnlock = true;
    this._counter = 1e3;
    this._html5AudioPool = [];
    this.html5PoolSize = 10;
    this._codecs = {};
    this._howls = [];
    this._muted = false;
    this._volume = 1;
    this._canPlayEvent = "canplaythrough";
    this._navigator = window.navigator;
    this._audioUnlocked = false;
    this._mobileUnloaded = false;
    this.state = "suspended";
    this._suspendTimer = null;
    this._setup();
  }
  volume(vol) {
    const volume = parseFloat(vol);
    if (!this.ctx) {
      this._setupAudioContext();
    }
    if (typeof volume !== "undefined" && volume >= 0 && volume <= 1) {
      this._volume = volume;
      if (this._muted) {
        return this;
      }
      if (this.usingWebAudio && this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
      }
      for (var i = 0; i < this._howls.length; i++) {
        if (!this._howls[i]._webAudio) {
          var ids = this._howls[i]._getSoundIds();
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
  mute(muted) {
    if (!this.ctx) {
      this._setupAudioContext();
    }
    this._muted = muted;
    if (this.usingWebAudio && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this._volume, this.ctx.currentTime);
    }
    for (var i = 0; i < this._howls.length; i++) {
      if (!this._howls[i]._webAudio) {
        var ids = this._howls[i]._getSoundIds();
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
  stop() {
    for (var i = 0; i < this._howls.length; i++) {
      this._howls[i].stop();
    }
    return this;
  }
  unload() {
    for (var i = this._howls.length - 1; i >= 0; i--) {
      this._howls[i].unload();
    }
    if (this.usingWebAudio && this.ctx && typeof this.ctx.close !== "undefined") {
      this.ctx.close();
      this.ctx = null;
      this._setupAudioContext();
    }
    return this;
  }
  codecs(ext) {
    return this._codecs[ext.replace(/^x-/, "")];
  }
  _setup() {
    this.state = this.ctx ? this.ctx.state || "suspended" : "suspended";
    this._autoSuspend();
    if (!this.usingWebAudio) {
      if (typeof Audio !== "undefined") {
        try {
          var test = new Audio();
          if (typeof test.oncanplaythrough === "undefined") {
            this._canPlayEvent = "canplay";
          }
        } catch (e) {
          this.noAudio = true;
        }
      } else {
        this.noAudio = true;
      }
    }
    try {
      var test = new Audio();
      if (test.muted) {
        this.noAudio = true;
      }
    } catch (e) {
    }
    if (!this.noAudio) {
      this._setupCodecs();
    }
    return this;
  }
  _setupAudioContext() {
    if (!this.usingWebAudio) {
      return;
    }
    try {
      if (typeof AudioContext !== "undefined") {
        this.ctx = new AudioContext();
      } else if (typeof webkitAudioContext !== "undefined") {
        this.ctx = new webkitAudioContext();
      } else {
        this.usingWebAudio = false;
      }
    } catch (e) {
      this.usingWebAudio = false;
    }
    if (!this.ctx) {
      this.usingWebAudio = false;
    }
    var iOS = /iP(hone|od|ad)/.test(this._navigator && this._navigator.platform);
    var appVersion = this._navigator && this._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
    var version = appVersion ? parseInt(appVersion[1], 10) : null;
    if (iOS && version && version < 9) {
      var safari = /safari/.test(this._navigator && this._navigator.userAgent.toLowerCase());
      if (this._navigator && !safari) {
        this.usingWebAudio = false;
      }
    }
    if (this.usingWebAudio) {
      this.masterGain = typeof this.ctx.createGain === "undefined" ? this.ctx.createGainNode() : this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    this._setup();
  }
  _setupCodecs() {
    let audioTest = null;
    try {
      audioTest = typeof Audio !== "undefined" ? new Audio() : null;
    } catch (err) {
      return this;
    }
    if (!audioTest || typeof audioTest.canPlayType !== "function") {
      return this;
    }
    const mpegTest = audioTest.canPlayType("audio/mpeg;").replace(/^no$/, "");
    const ua = this._navigator ? this._navigator.userAgent : "";
    const checkOpera = ua.match(/OPR\/([0-6].)/g);
    const isOldOpera = checkOpera && parseInt(checkOpera[0].split("/")[1], 10) < 33;
    const checkSafari = ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1;
    const safariVersion = ua.match(/Version\/(.*?) /);
    const isOldSafari = checkSafari && safariVersion && parseInt(safariVersion[1], 10) < 15;
    this._codecs = {
      mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType("audio/mp3;").replace(/^no$/, ""))),
      mpeg: !!mpegTest,
      opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
      ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
      oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
      wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType("audio/wav")).replace(/^no$/, ""),
      aac: !!audioTest.canPlayType("audio/aac;").replace(/^no$/, ""),
      caf: !!audioTest.canPlayType("audio/x-caf;").replace(/^no$/, ""),
      m4a: !!(audioTest.canPlayType("audio/x-m4a;") || audioTest.canPlayType("audio/m4a;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
      m4b: !!(audioTest.canPlayType("audio/x-m4b;") || audioTest.canPlayType("audio/m4b;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
      mp4: !!(audioTest.canPlayType("audio/x-mp4;") || audioTest.canPlayType("audio/mp4;") || audioTest.canPlayType("audio/aac;")).replace(/^no$/, ""),
      weba: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
      webm: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
      dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
      flac: !!(audioTest.canPlayType("audio/x-flac;") || audioTest.canPlayType("audio/flac;")).replace(/^no$/, "")
    };
    return this;
  }
  _unlockAudio() {
    if (this._audioUnlocked || !this.ctx) {
      return this;
    }
    this.autoUnlock = false;
    if (!this._mobileUnloaded && this.ctx.sampleRate !== 44100) {
      this._mobileUnloaded = true;
      this.unload();
    }
    this._scratchBuffer = this.ctx.createBuffer(1, 1, 22050);
    const unlock = () => {
      while (this._html5AudioPool.length < this.html5PoolSize) {
        try {
          var audioNode = new Audio();
          audioNode._unlocked = true;
          this._releaseHtml5Audio(audioNode);
        } catch (e) {
          this.noAudio = true;
          break;
        }
      }
      for (var i = 0; i < this._howls.length; i++) {
        if (!this._howls[i]._webAudio) {
          var ids = this._howls[i]._getSoundIds();
          for (var j = 0; j < ids.length; j++) {
            var sound = this._howls[i]._soundById(ids[j]);
            if (sound && sound._node && !sound._node._unlocked) {
              sound._node._unlocked = true;
              sound._node.load();
            }
          }
        }
      }
      this._autoResume();
      const source = this.ctx.createBufferSource();
      source.buffer = this._scratchBuffer;
      source.connect(this.ctx.destination);
      if (typeof source.start === "undefined") {
        source.noteOn(0);
      } else {
        source.start(0);
      }
      if (this.ctx && typeof this.ctx.resume === "function") {
        this.ctx.resume();
      }
      source.onended = () => {
        source.disconnect(0);
        this._audioUnlocked = true;
        document.removeEventListener("touchstart", unlock, true);
        document.removeEventListener("touchend", unlock, true);
        document.removeEventListener("click", unlock, true);
        document.removeEventListener("keydown", unlock, true);
        for (var i2 = 0; i2 < this._howls.length; i2++) {
          this._howls[i2]._emit("unlock");
        }
      };
    };
    document.addEventListener("touchstart", unlock, true);
    document.addEventListener("touchend", unlock, true);
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return this;
  }
  _obtainHtml5Audio() {
    if (this._html5AudioPool.length) {
      return this._html5AudioPool.pop();
    }
    var testPlay = new Audio().play();
    if (testPlay && typeof Promise !== "undefined" && (testPlay instanceof Promise || typeof testPlay.then === "function")) {
      testPlay.catch(function() {
        console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
      });
    }
    return new Audio();
  }
  _releaseHtml5Audio(audio) {
    if (audio._unlocked) {
      this._html5AudioPool.push(audio);
    }
    return this;
  }
  _autoSuspend() {
    if (!this.autoSuspend || !this.ctx || typeof this.ctx.suspend === "undefined" || !this.usingWebAudio) {
      return;
    }
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
    this._suspendTimer = setTimeout(() => {
      if (!this.autoSuspend) {
        return;
      }
      this._suspendTimer = null;
      this.state = "suspending";
      const handleSuspension = () => {
        this.state = "suspended";
        if (this._resumeAfterSuspend) {
          delete this._resumeAfterSuspend;
          this._autoResume();
        }
      };
      this.ctx.suspend().then(handleSuspension, handleSuspension);
    }, 3e4);
    return this;
  }
  _autoResume() {
    if (!this.ctx || typeof this.ctx.resume === "undefined" || !this.usingWebAudio) {
      return;
    }
    if (this.state === "running" && this.ctx.state !== "interrupted" && this._suspendTimer) {
      clearTimeout(this._suspendTimer);
      this._suspendTimer = null;
    } else if (this.state === "suspended" || this.state === "running" && this.ctx.state === "interrupted") {
      this.ctx.resume().then(() => {
        this.state = "running";
        for (var i = 0; i < this._howls.length; i++) {
          this._howls[i]._emit("resume");
        }
      });
      if (this._suspendTimer) {
        clearTimeout(this._suspendTimer);
        this._suspendTimer = null;
      }
    } else if (this.state === "suspending") {
      this._resumeAfterSuspend = true;
    }
    return this;
  }
};
var HowlerSingleton = new Howler();
var howler_default = HowlerSingleton;

// src/helpers.ts
var cache = {};
function loadBuffer(self) {
  var url = self._src;
  if (cache[url]) {
    self._duration = cache[url].duration;
    loadSound(self);
    return;
  }
  if (/^data:[^;]+;base64,/.test(url)) {
    var data = atob(url.split(",")[1]);
    var dataView = new Uint8Array(data.length);
    for (var i = 0; i < data.length; ++i) {
      dataView[i] = data.charCodeAt(i);
    }
    decodeAudioData(dataView.buffer, self);
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open(self._xhr.method, url, true);
    xhr.withCredentials = self._xhr.withCredentials;
    xhr.responseType = "arraybuffer";
    if (self._xhr) {
      Object.keys(self._xhr).forEach(function(key) {
        xhr.setRequestHeader(key, self._xhr[key]);
      });
    }
    xhr.onload = () => {
      var code = (xhr.status + "")[0];
      if (code !== "0" && code !== "2" && code !== "3") {
        self._emit("loaderror", null, "Failed loading audio file with status: " + xhr.status + ".");
        return;
      }
      decodeAudioData(xhr.response, self);
    };
    xhr.onerror = () => {
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
function safeXhrSend(xhr) {
  try {
    xhr.send();
  } catch (e) {
    console.error("XHR Request failed: ", e);
  }
}
function decodeAudioData(arraybuffer, self) {
  function error() {
    self._emit("loaderror", null, "Decoding audio data failed.");
  }
  function success(buffer) {
    if (buffer && self._sounds.length > 0) {
      cache[self._src] = buffer;
      loadSound(self, buffer);
    } else {
      error();
    }
  }
  if (typeof Promise !== "undefined" && howler_default.ctx.decodeAudioData.length === 1) {
    howler_default.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
  } else {
    howler_default.ctx.decodeAudioData(arraybuffer, success, error);
  }
}
function loadSound(self, buffer) {
  if (buffer && !self._duration) {
    self._duration = buffer.duration;
  }
  if (Object.keys(self._sprite).length === 0) {
    self._sprite = { __default: [0, self._duration * 1e3] };
  }
  if (self._state !== "loaded") {
    self._state = "loaded";
    self._emit("load");
    self._loadQueue();
  }
}

// src/sound.ts
var Sound = class {
  constructor(howl) {
    this._seek = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = "__default";
    this._errorFn = () => {
    };
    this._loadFn = () => {
    };
    this._endFn = () => {
    };
    this._playStart = 0;
    this._start = 0;
    this._stop = 0;
    this._fadeTo = null;
    this._interval = null;
    this._parent = howl;
    this._muted = Boolean(howl._muted);
    this._loop = Boolean(howl._loop);
    this._volume = howl._volume;
    this._rate = howl._rate;
    this._id = ++howler_default._counter;
    this._parent._sounds.push(this);
    if (this._parent._webAudio && howler_default.ctx) {
      this._node = typeof howler_default.ctx.createGain === "undefined" ? howler_default.ctx.createGainNode() : howler_default.ctx.createGain();
    } else {
      this._node = howler_default._obtainHtml5Audio();
    }
    this.create();
  }
  create() {
    var parent = this._parent;
    var volume = howler_default._muted || this._muted || this._parent._muted ? 0 : this._volume;
    if (parent._webAudio && howler_default.ctx) {
      this._node.gain.setValueAtTime(volume, howler_default.ctx.currentTime);
      this._node.paused = true;
      this._node.connect(howler_default.masterGain);
    } else if (!howler_default.noAudio) {
      this._errorFn = this._errorListener.bind(this);
      this._node.addEventListener("error", this._errorFn, false);
      this._loadFn = this._loadListener.bind(this);
      this._node.addEventListener(howler_default._canPlayEvent, this._loadFn, false);
      this._endFn = this._endListener.bind(this);
      this._node.addEventListener("ended", this._endFn, false);
      this._node.src = parent._src;
      this._node.preload = parent._preload === true ? "auto" : parent._preload;
      this._node.volume = volume * howler_default.volume();
      this._node.load();
    }
    return this;
  }
  reset() {
    var parent = this._parent;
    this._muted = parent._muted;
    this._loop = parent._loop;
    this._volume = parent._volume;
    this._rate = parent._rate;
    this._seek = 0;
    this._rateSeek = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = "__default";
    this._id = ++howler_default._counter;
    return this;
  }
  _errorListener() {
    this._parent._emit("loaderror", this._id, this._node.error instanceof MediaError ? this._node.error.code : 0);
    this._node.removeEventListener("error", this._errorFn, false);
  }
  _loadListener() {
    const parent = this._parent;
    parent._duration = Math.ceil(this._node.duration * 10) / 10;
    if (Object.keys(parent._sprite).length === 0) {
      parent._sprite = { __default: [0, parent._duration * 1e3] };
    }
    if (parent._state !== "loaded") {
      parent._state = "loaded";
      parent._emit("load");
      parent._loadQueue();
    }
    this._node.removeEventListener(howler_default._canPlayEvent, this._loadFn, false);
  }
  _endListener() {
    const parent = this._parent;
    if (parent._duration === Infinity) {
      parent._duration = Math.ceil(this._node.duration * 10) / 10;
      if (parent._sprite.__default[1] === Infinity) {
        parent._sprite.__default[1] = parent._duration * 1e3;
      }
      parent._ended(this);
    }
    this._node.removeEventListener("ended", this._endFn, false);
  }
};
var sound_default = Sound;

// src/howl.ts
var Howl = class {
  constructor(o) {
    this._autoplay = false;
    this._format = [];
    this._html5 = false;
    this._muted = false;
    this._loop = false;
    this._pool = 5;
    this._preload = true;
    this._rate = 1;
    this._sprite = {};
    this._src = [];
    this._volume = 1;
    this._duration = 0;
    this._state = "unloaded";
    this._sounds = [];
    this._endTimers = {};
    this._queue = [];
    this._playLock = false;
    this._onend = [];
    this._onfade = [];
    this._onload = [];
    this._onloaderror = [];
    this._onplayerror = [];
    this._onpause = [];
    this._onplay = [];
    this._onstop = [];
    this._onmute = [];
    this._onvolume = [];
    this._onrate = [];
    this._onseek = [];
    this._onunlock = [];
    this._onresume = [];
    if (!o.src || o.src.length === 0) {
      console.error("An array of source files must be passed with any new Howl.");
      return;
    }
    if (!howler_default.ctx) {
      howler_default._setupAudioContext();
    }
    this._format = o.format === void 0 ? [] : typeof o.format !== "string" ? o.format : [o.format];
    this._html5 = o.html5 || false;
    this._muted = o.mute || false;
    this._loop = o.loop || false;
    this._pool = o.pool || 5;
    this._preload = typeof o.preload === "boolean" || o.preload === "metadata" ? o.preload : true;
    this._rate = o.rate || 1;
    this._sprite = o.sprite || {};
    this._src = typeof o.src !== "string" ? o.src : [o.src];
    this._volume = o.volume !== void 0 ? o.volume : 1;
    this._xhr = {
      method: o.xhr && o.xhr.method ? o.xhr.method : "GET",
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : void 0,
      withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false
    };
    this._onend = o.onend ? [{ fn: o.onend }] : [];
    this._onfade = o.onfade ? [{ fn: o.onfade }] : [];
    this._onload = o.onload ? [{ fn: o.onload }] : [];
    this._onloaderror = o.onloaderror ? [{ fn: o.onloaderror }] : [];
    this._onplayerror = o.onplayerror ? [{ fn: o.onplayerror }] : [];
    this._onpause = o.onpause ? [{ fn: o.onpause }] : [];
    this._onplay = o.onplay ? [{ fn: o.onplay }] : [];
    this._onstop = o.onstop ? [{ fn: o.onstop }] : [];
    this._onmute = o.onmute ? [{ fn: o.onmute }] : [];
    this._onvolume = o.onvolume ? [{ fn: o.onvolume }] : [];
    this._onrate = o.onrate ? [{ fn: o.onrate }] : [];
    this._onseek = o.onseek ? [{ fn: o.onseek }] : [];
    this._onunlock = o.onunlock ? [{ fn: o.onunlock }] : [];
    this._onresume = [];
    this._webAudio = howler_default.usingWebAudio && !this._html5;
    if (typeof howler_default.ctx !== "undefined" && howler_default.ctx && howler_default.autoUnlock) {
      howler_default._unlockAudio();
    }
    howler_default._howls.push(this);
    if (this._autoplay) {
      this._queue.push({
        event: "play",
        action: () => {
          this.play();
        }
      });
    }
    if (this._preload) {
      this.load();
    }
  }
  load() {
    var url = null;
    if (howler_default.noAudio) {
      this._emit("loaderror", null, "No audio support.");
      return this;
    }
    if (typeof this._src === "string") {
      this._src = [this._src];
    }
    for (var i = 0; i < this._src.length; i++) {
      var ext, str;
      if (this._format && this._format[i]) {
        ext = this._format[i];
      } else {
        str = this._src[i];
        if (typeof str !== "string") {
          this._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
          continue;
        }
        ext = /^data:audio\/([^;,]+);/i.exec(str);
        if (!ext) {
          ext = /\.([^.]+)$/.exec(str.split("?", 1)[0]);
        }
        if (ext) {
          ext = ext[1].toLowerCase();
        }
      }
      if (!ext) {
        console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
      }
      if (ext && howler_default.codecs(ext)) {
        url = this._src[i];
        break;
      }
    }
    if (!url) {
      this._emit("loaderror", null, "No codec support for selected audio sources.");
      return this;
    }
    this._src = url;
    this._state = "loading";
    if (window.location.protocol === "https:" && url.slice(0, 5) === "http:") {
      this._html5 = true;
      this._webAudio = false;
    }
    new sound_default(this);
    if (this._webAudio) {
      loadBuffer(this);
    }
    return this;
  }
  play(sprite, internal) {
    var id = null;
    if (typeof sprite === "number") {
      id = sprite;
      sprite = null;
    } else if (typeof sprite === "string" && this._state === "loaded" && !this._sprite[sprite]) {
      return null;
    } else if (typeof sprite === "undefined") {
      sprite = "__default";
      if (!this._playLock) {
        var num = 0;
        for (var i = 0; i < this._sounds.length; i++) {
          if (this._sounds[i]._paused && !this._sounds[i]._ended) {
            num++;
            id = this._sounds[i]._id;
          }
        }
        if (num === 1) {
          sprite = null;
        } else {
          id = null;
        }
      }
    }
    const sound = id ? this._soundById(id) : this._inactiveSound();
    if (!sound) {
      return null;
    }
    if (id && !sprite) {
      sprite = sound._sprite || "__default";
    }
    if (this._state !== "loaded") {
      sound._sprite = sprite;
      sound._ended = false;
      var soundId = sound._id;
      this._queue.push({
        event: "play",
        action: () => {
          this.play(soundId);
        }
      });
      return soundId;
    }
    if (id && !sound._paused) {
      if (!internal) {
        this._loadQueue("play");
      }
      return sound._id;
    }
    if (this._webAudio) {
      howler_default._autoResume();
    }
    const seek = Math.max(0, sound._seek > 0 ? sound._seek : this._sprite[sprite][0] / 1e3);
    const duration = Math.max(0, (this._sprite[sprite][0] + this._sprite[sprite][1]) / 1e3 - seek);
    const timeout = duration * 1e3 / Math.abs(sound._rate);
    const start = this._sprite[sprite][0] / 1e3;
    const stop = (this._sprite[sprite][0] + this._sprite[sprite][1]) / 1e3;
    sound._sprite = sprite;
    sound._ended = false;
    const setParams = () => {
      sound._paused = false;
      sound._seek = seek;
      sound._start = start;
      sound._stop = stop;
      sound._loop = !!(sound._loop || this._sprite[sprite][2]);
    };
    if (seek >= stop) {
      this._ended(sound);
      return;
    }
    const node = sound._node;
    if (this._webAudio) {
      const playWebAudio = () => {
        this._playLock = false;
        setParams();
        this._refreshBuffer(sound);
        const vol = sound._muted || this._muted ? 0 : sound._volume;
        node.gain.setValueAtTime(vol, howler_default.ctx.currentTime);
        sound._playStart = howler_default.ctx.currentTime;
        if (typeof node.bufferSource.start === "undefined") {
          sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
        } else {
          sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
        }
        if (timeout !== Infinity) {
          this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
        }
        if (!internal) {
          setTimeout(() => {
            this._emit("play", sound._id);
            this._loadQueue();
          }, 0);
        }
      };
      if (howler_default.state === "running" && howler_default.ctx.state !== "interrupted") {
        playWebAudio();
      } else {
        this._playLock = true;
        this.once("resume", playWebAudio);
        this._clearTimer(sound._id);
      }
    } else {
      const playHtml5 = () => {
        node.currentTime = seek;
        node.muted = sound._muted || this._muted || howler_default._muted || node.muted;
        node.volume = sound._volume * howler_default.volume();
        node.playbackRate = sound._rate;
        try {
          const play = node.play();
          if (play && typeof Promise !== "undefined" && (play instanceof Promise || typeof play.then === "function")) {
            this._playLock = true;
            setParams();
            play.then(() => {
              this._playLock = false;
              node._unlocked = true;
              if (!internal) {
                this._emit("play", sound._id);
              } else {
                this._loadQueue();
              }
            }).catch(() => {
              this._playLock = false;
              this._emit("playerror", sound._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
              sound._ended = true;
              sound._paused = true;
            });
          } else if (!internal) {
            this._playLock = false;
            setParams();
            this._emit("play", sound._id);
          }
          node.playbackRate = sound._rate;
          if (node.paused) {
            this._emit("playerror", sound._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
            return;
          }
          if (sprite !== "__default" || sound._loop) {
            this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
          } else {
            this._endTimers[sound._id] = () => {
              this._ended(sound);
              node.removeEventListener("ended", this._endTimers[sound._id], false);
            };
            node.addEventListener("ended", this._endTimers[sound._id], false);
          }
        } catch (err) {
          this._emit("playerror", sound._id, err);
        }
      };
      if (node.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA") {
        node.src = this._src;
        node.load();
      }
      const loadedNoReadyState = window && window.ejecta || !node.readyState && howler_default._navigator.isCocoonJS;
      if (node.readyState >= 3 || loadedNoReadyState) {
        playHtml5();
      } else {
        this._playLock = true;
        this._state = "loading";
        const listener = () => {
          this._state = "loaded";
          playHtml5();
          node.removeEventListener(howler_default._canPlayEvent, listener, false);
        };
        node.addEventListener(howler_default._canPlayEvent, listener, false);
        this._clearTimer(sound._id);
      }
    }
    return sound._id;
  }
  pause(id, skipEmit) {
    if (this._state !== "loaded" || this._playLock) {
      this._queue.push({
        event: "pause",
        action: () => {
          this.pause(id);
        }
      });
      return this;
    }
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      this._clearTimer(ids[i]);
      var sound = this._soundById(ids[i]);
      if (sound && !sound._paused) {
        sound._seek = this.seek(ids[i]);
        sound._rateSeek = 0;
        sound._paused = true;
        this._stopFade(ids[i]);
        if (sound._node) {
          if (this._webAudio) {
            if (!sound._node.bufferSource) {
              continue;
            }
            if (typeof sound._node.bufferSource.stop === "undefined") {
              sound._node.bufferSource.noteOff(0);
            } else {
              sound._node.bufferSource.stop(0);
            }
            this._cleanBuffer(sound._node);
          } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
            sound._node.pause();
          }
        }
      }
      if (!skipEmit) {
        this._emit("pause", sound ? sound._id : null);
      }
    }
    return this;
  }
  stop(id, internal) {
    if (this._state !== "loaded" || this._playLock) {
      this._queue.push({
        event: "stop",
        action: () => {
          this.stop(id);
        }
      });
      return this;
    }
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      this._clearTimer(ids[i]);
      var sound = this._soundById(ids[i]);
      if (sound) {
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._paused = true;
        sound._ended = true;
        this._stopFade(ids[i]);
        if (sound._node) {
          if (this._webAudio) {
            if (sound._node.bufferSource) {
              if (typeof sound._node.bufferSource.stop === "undefined") {
                sound._node.bufferSource.noteOff(0);
              } else {
                sound._node.bufferSource.stop(0);
              }
              this._cleanBuffer(sound._node);
            }
          } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
            sound._node.currentTime = sound._start || 0;
            sound._node.pause();
            if (sound._node.duration === Infinity) {
              this._clearSound(sound._node);
            }
          }
        }
        if (!internal) {
          this._emit("stop", sound._id);
        }
      }
    }
    return this;
  }
  mute(muted, id) {
    if (this._state !== "loaded" || this._playLock) {
      this._queue.push({
        event: "mute",
        action: () => {
          this.mute(muted, id);
        }
      });
      return this;
    }
    if (typeof id === "undefined") {
      if (typeof muted === "boolean") {
        this._muted = muted;
      } else {
        return this._muted;
      }
    }
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      var sound = this._soundById(ids[i]);
      if (sound) {
        sound._muted = muted;
        if (sound._interval) {
          this._stopFade(sound._id);
        }
        if (this._webAudio && sound._node && howler_default.ctx) {
          sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, howler_default.ctx.currentTime);
        } else if (sound._node) {
          sound._node.muted = howler_default._muted ? true : muted;
        }
        this._emit("mute", sound._id);
      }
    }
    return this;
  }
  volume(...args) {
    let vol, id;
    if (args.length === 0) {
      return this._volume;
    } else if (args.length === 1 || args.length === 2 && typeof args[1] === "undefined") {
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else {
        vol = parseFloat(args[0]);
      }
    } else if (args.length >= 2) {
      vol = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    let sound;
    if (typeof vol !== "undefined" && vol >= 0 && vol <= 1) {
      if (this._state !== "loaded" || this._playLock) {
        this._queue.push({
          event: "volume",
          action: () => {
            this.volume.apply(this, args);
          }
        });
        return this;
      }
      if (typeof id === "undefined") {
        this._volume = vol;
      }
      id = this._getSoundIds(id);
      for (var i = 0; i < id.length; i++) {
        sound = this._soundById(id[i]);
        if (sound) {
          sound._volume = vol;
          if (!args[2]) {
            this._stopFade(id[i]);
          }
          if (this._webAudio && sound._node && !sound._muted && howler_default.ctx) {
            sound._node.gain.setValueAtTime(vol, howler_default.ctx.currentTime);
          } else if (sound._node && !sound._muted) {
            sound._node.volume = vol * howler_default.volume();
          }
          this._emit("volume", sound._id);
        }
      }
    } else {
      sound = id ? this._soundById(id) : this._sounds[0];
      return sound ? sound._volume : 0;
    }
    return this;
  }
  fade(from, to, len, id) {
    if (this._state !== "loaded" || this._playLock) {
      this._queue.push({
        event: "fade",
        action: () => {
          this.fade(from, to, len, id);
        }
      });
      return this;
    }
    from = Math.min(Math.max(0, parseFloat(from)), 1);
    to = Math.min(Math.max(0, parseFloat(to)), 1);
    len = parseFloat(len);
    this.volume(from, id);
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      var sound = this._soundById(ids[i]);
      if (sound) {
        if (!id) {
          this._stopFade(ids[i]);
        }
        if (this._webAudio && !sound._muted && howler_default.ctx) {
          var currentTime = howler_default.ctx.currentTime;
          var end = currentTime + len / 1e3;
          sound._volume = from;
          sound._node.gain.setValueAtTime(from, currentTime);
          sound._node.gain.linearRampToValueAtTime(to, end);
        }
        this._startFadeInterval(sound, from, to, len, ids[i], typeof id === "undefined");
      }
    }
    return this;
  }
  _startFadeInterval(sound, from, to, len, id, isGroup) {
    var vol = from;
    var diff = to - from;
    var steps = Math.abs(diff / 0.01);
    var stepLen = Math.max(4, steps > 0 ? len / steps : len);
    var lastTick = Date.now();
    sound._fadeTo = to;
    sound._interval = setInterval(() => {
      var tick = (Date.now() - lastTick) / len;
      lastTick = Date.now();
      vol += diff * tick;
      vol = Math.round(vol * 100) / 100;
      if (diff < 0) {
        vol = Math.max(to, vol);
      } else {
        vol = Math.min(to, vol);
      }
      if (this._webAudio) {
        sound._volume = vol;
      } else {
        this.volume(vol, sound._id, true);
      }
      if (isGroup) {
        this._volume = vol;
      }
      if (to < from && vol <= to || to > from && vol >= to) {
        if (typeof sound._interval === "number") {
          clearInterval(sound._interval);
        }
        sound._interval = null;
        sound._fadeTo = null;
        this.volume(to, sound._id);
        this._emit("fade", sound._id);
      }
    }, stepLen);
  }
  _stopFade(id) {
    var sound = this._soundById(id);
    if (sound && sound._interval) {
      if (this._webAudio && howler_default.ctx) {
        sound._node.gain.cancelScheduledValues(howler_default.ctx.currentTime);
      }
      clearInterval(sound._interval);
      sound._interval = null;
      this.volume(sound._fadeTo, id);
      sound._fadeTo = null;
      this._emit("fade", id);
    }
    return this;
  }
  loop(...args) {
    let loop, id, sound;
    if (args.length === 0) {
      return this._loop;
    } else if (args.length === 1) {
      if (typeof args[0] === "boolean") {
        loop = args[0];
        this._loop = loop;
      } else {
        sound = this._soundById(parseInt(args[0], 10));
        return sound ? sound._loop : false;
      }
    } else if (args.length === 2) {
      loop = args[0];
      id = parseInt(args[1], 10);
    }
    var ids = this._getSoundIds(id);
    for (var i = 0; i < ids.length; i++) {
      sound = this._soundById(ids[i]);
      if (sound) {
        sound._loop = loop;
        if (this._webAudio && sound._node && sound._node.bufferSource) {
          sound._node.bufferSource.loop = loop;
          if (loop) {
            sound._node.bufferSource.loopStart = sound._start || 0;
            sound._node.bufferSource.loopEnd = sound._stop;
            if (this.playing(ids[i])) {
              this.pause(ids[i], true);
              this.play(ids[i], true);
            }
          }
        }
      }
    }
    return this;
  }
  rate(...args) {
    let rate, id;
    if (args.length === 0) {
      id = this._sounds[0]._id;
    } else if (args.length === 1) {
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else {
        rate = parseFloat(args[0]);
      }
    } else if (args.length === 2) {
      rate = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    let sound;
    if (typeof rate === "number") {
      if (this._state !== "loaded" || this._playLock) {
        this._queue.push({
          event: "rate",
          action: () => {
            this.rate.apply(this, args);
          }
        });
        return this;
      }
      if (typeof id === "undefined") {
        this._rate = rate;
      }
      id = this._getSoundIds(id);
      for (var i = 0; i < id.length; i++) {
        sound = this._soundById(id[i]);
        if (sound && howler_default.ctx) {
          if (this.playing(id[i])) {
            sound._rateSeek = this.seek(id[i]);
            sound._playStart = this._webAudio ? howler_default.ctx.currentTime : sound._playStart;
          }
          sound._rate = rate;
          if (this._webAudio && sound._node && sound._node.bufferSource) {
            sound._node.bufferSource.playbackRate.setValueAtTime(rate, howler_default.ctx.currentTime);
          } else if (sound._node) {
            sound._node.playbackRate = rate;
          }
          const seek = this.seek(id[i]);
          const duration = (this._sprite[sound._sprite][0] + this._sprite[sound._sprite][1]) / 1e3 - seek;
          const timeout = duration * 1e3 / Math.abs(sound._rate);
          if (this._endTimers[id[i]] || !sound._paused) {
            this._clearTimer(id[i]);
            this._endTimers[id[i]] = setTimeout(this._ended.bind(this, sound), timeout);
          }
          this._emit("rate", sound._id);
        }
      }
    } else {
      sound = this._soundById(id);
      return sound ? sound._rate : this._rate;
    }
    return this;
  }
  seek(...args) {
    let seek, id;
    if (args.length === 0) {
      if (this._sounds.length) {
        id = this._sounds[0]._id;
      }
    } else if (args.length === 1) {
      var ids = this._getSoundIds();
      var index = ids.indexOf(args[0]);
      if (index >= 0) {
        id = parseInt(args[0], 10);
      } else if (this._sounds.length) {
        id = this._sounds[0]._id;
        seek = parseFloat(args[0]);
      }
    } else if (args.length === 2) {
      seek = parseFloat(args[0]);
      id = parseInt(args[1], 10);
    }
    if (typeof id === "undefined") {
      return 0;
    }
    if (typeof seek === "number" && (this._state !== "loaded" || this._playLock)) {
      this._queue.push({
        event: "seek",
        action: () => {
          this.seek.apply(this, args);
        }
      });
      return this;
    }
    var sound = this._soundById(id);
    if (sound) {
      if (typeof seek === "number" && seek >= 0) {
        var playing = this.playing(id);
        if (playing) {
          this.pause(id, true);
        }
        sound._seek = seek;
        sound._ended = false;
        this._clearTimer(id);
        if (!this._webAudio && sound._node && !isNaN(sound._node.duration)) {
          sound._node.currentTime = seek;
        }
        const seekAndEmit = () => {
          if (playing) {
            this.play(id, true);
          }
          this._emit("seek", id);
        };
        if (playing && !this._webAudio) {
          const emitSeek = () => {
            if (!this._playLock) {
              seekAndEmit();
            } else {
              setTimeout(emitSeek, 0);
            }
          };
          setTimeout(emitSeek, 0);
        } else {
          seekAndEmit();
        }
      } else {
        if (this._webAudio && howler_default.ctx) {
          const realTime = this.playing(id) ? howler_default.ctx.currentTime - sound._playStart : 0;
          const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
          return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
        } else {
          return sound._node.currentTime;
        }
      }
    }
    return this;
  }
  playing(id) {
    if (typeof id === "number") {
      var sound = this._soundById(id);
      return sound ? !sound._paused : false;
    }
    for (var i = 0; i < this._sounds.length; i++) {
      if (!this._sounds[i]._paused) {
        return true;
      }
    }
    return false;
  }
  duration(id) {
    var duration = this._duration;
    var sound = this._soundById(id);
    if (sound) {
      duration = this._sprite[sound._sprite][1] / 1e3;
    }
    return duration;
  }
  state() {
    return this._state;
  }
  unload() {
    var sounds = this._sounds;
    for (let i = 0; i < sounds.length; i++) {
      if (!sounds[i]._paused) {
        this.stop(sounds[i]._id);
      }
      if (!this._webAudio) {
        this._clearSound(sounds[i]._node);
        sounds[i]._node.removeEventListener("error", sounds[i]._errorFn, false);
        sounds[i]._node.removeEventListener(howler_default._canPlayEvent, sounds[i]._loadFn, false);
        sounds[i]._node.removeEventListener("ended", sounds[i]._endFn, false);
        howler_default._releaseHtml5Audio(sounds[i]._node);
      }
      delete sounds[i]._node;
      this._clearTimer(sounds[i]._id);
    }
    var index = howler_default._howls.indexOf(this);
    if (index >= 0) {
      howler_default._howls.splice(index, 1);
    }
    var remCache = true;
    for (let i = 0; i < howler_default._howls.length; i++) {
      if (howler_default._howls[i]._src === this._src || this._src.indexOf(howler_default._howls[i]._src) >= 0) {
        remCache = false;
        break;
      }
    }
    if (cache && remCache) {
      delete cache[this._src];
    }
    howler_default.noAudio = false;
    this._state = "unloaded";
    this._sounds = [];
    return null;
  }
  on(event, fn, id, once) {
    var events = this["_on" + event];
    if (typeof fn === "function") {
      events.push(once ? { id, fn, once } : { id, fn });
    }
    return this;
  }
  off(event, fn, id) {
    var events = this["_on" + event];
    var i = 0;
    if (typeof fn === "number") {
      id = fn;
      fn = null;
    }
    if (fn || id) {
      for (i = 0; i < events.length; i++) {
        var isId = id === events[i].id;
        if (fn === events[i].fn && isId || !fn && isId) {
          events.splice(i, 1);
          break;
        }
      }
    } else if (event) {
      this["_on" + event] = [];
    } else {
      var keys = Object.keys(this);
      for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("_on") === 0 && Array.isArray(this[keys[i]])) {
          this[keys[i]] = [];
        }
      }
    }
    return this;
  }
  once(event, fn, id) {
    this.on(event, fn, id, 1);
    return this;
  }
  _emit(event, id, msg) {
    var events = this["_on" + event];
    for (var i = events.length - 1; i >= 0; i--) {
      if (!events[i].id || events[i].id === id || event === "load") {
        setTimeout(((fn) => {
          fn.call(this, id, msg);
        }).bind(this, events[i].fn), 0);
        if (events[i].once) {
          this.off(event, events[i].fn, events[i].id);
        }
      }
    }
    this._loadQueue(event);
    return this;
  }
  _loadQueue(event) {
    if (this._queue.length > 0) {
      var task = this._queue[0];
      if (task.event === event) {
        this._queue.shift();
        this._loadQueue();
      }
      if (!event) {
        task.action();
      }
    }
    return this;
  }
  _ended(sound) {
    var sprite = sound._sprite;
    if (!this._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
      setTimeout(this._ended.bind(this, sound), 100);
      return this;
    }
    var loop = !!(sound._loop || this._sprite[sprite][2]);
    this._emit("end", sound._id);
    if (!this._webAudio && loop) {
      this.stop(sound._id, true).play(sound._id);
    }
    if (this._webAudio && loop && howler_default.ctx) {
      this._emit("play", sound._id);
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      sound._playStart = howler_default.ctx.currentTime;
      var timeout = (sound._stop - sound._start) * 1e3 / Math.abs(sound._rate);
      this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
    }
    if (this._webAudio && !loop) {
      sound._paused = true;
      sound._ended = true;
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      this._clearTimer(sound._id);
      this._cleanBuffer(sound._node);
      howler_default._autoSuspend();
    }
    if (!this._webAudio && !loop) {
      this.stop(sound._id, true);
    }
    return this;
  }
  _clearTimer(id) {
    if (this._endTimers[id]) {
      if (typeof this._endTimers[id] !== "function") {
        clearTimeout(this._endTimers[id]);
      } else {
        var sound = this._soundById(id);
        if (sound && sound._node) {
          sound._node.removeEventListener("ended", this._endTimers[id], false);
        }
      }
      delete this._endTimers[id];
    }
    return this;
  }
  _soundById(id) {
    for (var i = 0; i < this._sounds.length; i++) {
      if (id === this._sounds[i]._id) {
        return this._sounds[i];
      }
    }
    return null;
  }
  _inactiveSound() {
    this._drain();
    for (let i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        return this._sounds[i].reset();
      }
    }
    return new sound_default(this);
  }
  _drain() {
    const limit = this._pool;
    let cnt = 0;
    let i = 0;
    if (this._sounds.length < limit) {
      return;
    }
    for (i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        cnt++;
      }
    }
    for (i = this._sounds.length - 1; i >= 0; i--) {
      if (cnt <= limit) {
        return;
      }
      if (this._sounds[i]._ended) {
        if (this._webAudio && this._sounds[i]._node) {
          this._sounds[i]._node.disconnect(0);
        }
        this._sounds.splice(i, 1);
        cnt--;
      }
    }
  }
  _getSoundIds(id) {
    if (typeof id === "undefined") {
      var ids = [];
      for (var i = 0; i < this._sounds.length; i++) {
        ids.push(this._sounds[i]._id);
      }
      return ids;
    } else {
      return [id];
    }
  }
  _refreshBuffer(sound) {
    sound._node.bufferSource = howler_default.ctx.createBufferSource();
    sound._node.bufferSource.buffer = cache[this._src];
    if (sound._panner) {
      sound._node.bufferSource.connect(sound._panner);
    } else {
      sound._node.bufferSource.connect(sound._node);
    }
    sound._node.bufferSource.loop = sound._loop;
    if (sound._loop) {
      sound._node.bufferSource.loopStart = sound._start || 0;
      sound._node.bufferSource.loopEnd = sound._stop || 0;
    }
    sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, howler_default.ctx.currentTime);
    return this;
  }
  _cleanBuffer(node) {
    var isIOS = howler_default._navigator && howler_default._navigator.vendor.indexOf("Apple") >= 0;
    if (howler_default._scratchBuffer && node.bufferSource) {
      node.bufferSource.onended = null;
      node.bufferSource.disconnect(0);
      if (isIOS) {
        try {
          node.bufferSource.buffer = howler_default._scratchBuffer;
        } catch (e) {
        }
      }
    }
    node.bufferSource = null;
    return this;
  }
  _clearSound(node) {
    var checkIE = /MSIE |Trident\//.test(howler_default._navigator && howler_default._navigator.userAgent);
    if (!checkIE) {
      node.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    }
  }
};
var howl_default = Howl;
export {
  howl_default as Howl,
  howler_default as Howler
};
/*!
 *  howler.js v2.2.3
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
