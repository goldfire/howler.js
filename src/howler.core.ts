/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
// Import shared types
import { cache, EventListener, HowlOptions, QueueItem } from './types';

// Import helper functions
import { isAppleVendor, isIE, isOldOpera, isOldSafari, loadBuffer, setupAudioContext } from './helpers';

// Import plugin manager
import { globalPluginManager, HowlerPlugin } from './plugins';

export class HowlerGlobal {
  _counter: number = 1000;
  _html5AudioPool: HTMLAudioElement[] = [];
  html5PoolSize: number = 10;
  _codecs: Record<string, boolean> = {};
  _howls: Howl[] = [];
  _muted: boolean = false;
  _volume: number = 1;
  _canPlayEvent: string = 'canplaythrough';
  _navigator: Navigator | null = null;
  masterGain: GainNode | null = null;
  noAudio: boolean = false;
  usingWebAudio: boolean = true;
  autoSuspend: boolean = true;
  ctx: AudioContext | null = null;
  autoUnlock: boolean = true;
  state: string = 'suspended';
  _audioUnlocked: boolean = false;
  _scratchBuffer: AudioBuffer | null = null;
  _suspendTimer: ReturnType<typeof setTimeout> | null = null;
  _resumeAfterSuspend?: boolean;
  _mobileUnloaded?: boolean;

  constructor() {
    this.init();
  }

  init(): HowlerGlobal {
    const self = this;

    self._counter = 1000;
    self._html5AudioPool = [];
    self.html5PoolSize = 10;
    self._codecs = {};
    self._howls = [];
    self._muted = false;
    self._volume = 1;
    self._canPlayEvent = 'canplaythrough';
    self._navigator = typeof window !== 'undefined' && window.navigator ? window.navigator : null;

    self.masterGain = null;
    self.noAudio = false;
    self.usingWebAudio = true;
    self.autoSuspend = true;
    self.ctx = null;
    self.autoUnlock = true;

    self._setup();

    // Register the Howler instance with the plugin manager
    // This allows plugins registered after initialization to access it via onRegister
    globalPluginManager.setHowlerInstance(self);

    return self;
  }

  volume(vol?: number): number | HowlerGlobal {
    const self = this;
    if (vol !== undefined) {
      vol = parseFloat(vol as any);

      if (!self.ctx) {
        setupAudioContext();
      }

      if (typeof vol === 'number' && vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (self._muted) {
          return self;
        }

        if (self.usingWebAudio) {
          self.masterGain!.gain.setValueAtTime(vol, Howler.ctx!.currentTime);
        }

        for (let i = 0; i < self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            const ids = self._howls[i]._getSoundIds();
            for (let j = 0; j < ids.length; j++) {
              const sound = self._howls[i]._soundById(ids[j]);
              if (sound && sound._node) {
                sound._node.volume = sound._volume * vol;
              }
            }
          }
        }

        return self;
      }
    }

    return self._volume;
  }

  mute(muted: boolean): HowlerGlobal {
    const self = this;

    if (!self.ctx) {
      setupAudioContext();
    }

    self._muted = muted;

    if (self.usingWebAudio) {
      self.masterGain!.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx!.currentTime);
    }

    for (let i = 0; i < self._howls.length; i++) {
      if (!self._howls[i]._webAudio) {
        const ids = self._howls[i]._getSoundIds();
        for (let j = 0; j < ids.length; j++) {
          const sound = self._howls[i]._soundById(ids[j]);
          if (sound && sound._node) {
            sound._node.muted = muted ? true : sound._muted;
          }
        }
      }
    }

    return self;
  }

  stop(): HowlerGlobal {
    const self = this;

    for (let i = 0; i < self._howls.length; i++) {
      self._howls[i].stop();
    }

    return self;
  }

  unload(): HowlerGlobal {
    const self = this;

    for (let i = self._howls.length - 1; i >= 0; i--) {
      self._howls[i].unload();
    }

    if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
      self.ctx.close();
      self.ctx = null;
      setupAudioContext();
    }

    return self;
  }

  codecs(ext: string): boolean {
    return (this || Howler)._codecs[ext.replace(/^x-/, '')];
  }

  /**
   * Register a plugin with Howler
   * @param plugin - The plugin to register
   * @returns this for chaining
   * @throws Error if a plugin with the same name is already registered
   */
  addPlugin(plugin: HowlerPlugin): HowlerGlobal {
    globalPluginManager.register(plugin);
    return this;
  }

  /**
   * Unregister a plugin from Howler
   * @param plugin - The plugin instance to unregister
   * @returns this for chaining
   * @throws Error if the plugin is not registered
   */
  removePlugin(plugin: HowlerPlugin): HowlerGlobal {
    globalPluginManager.unregister(plugin.name);
    return this;
  }

  /**
   * Check if a plugin is registered
   * @param pluginName - The name of the plugin to check
   * @returns true if the plugin is registered, false otherwise
   */
  hasPlugin(pluginName: string): boolean {
    return globalPluginManager.isRegistered(pluginName);
  }

  _setup(): HowlerGlobal {
    const self = this;

    self.state = self.ctx ? self.ctx.state || 'suspended' : 'suspended';
    self._autoSuspend();

    if (!self.usingWebAudio) {
      if (typeof window.Audio !== 'undefined') {
        try {
          const test = new window.Audio();
          if (typeof test.oncanplaythrough === 'undefined') {
            self._canPlayEvent = 'canplay';
          }
        } catch (e) {
          self.noAudio = true;
        }
      } else {
        self.noAudio = true;
      }
    }

    try {
      const test = new window.Audio();
      if (test.muted) {
        self.noAudio = true;
      }
    } catch (e) {}

    if (!self.noAudio) {
      self._setupCodecs();
    }

    return self;
  }

  _setupCodecs(): HowlerGlobal {
    const self = this;
    let audioTest: any = null;

    try {
      audioTest = typeof window.Audio !== 'undefined' ? new window.Audio() : null;
    } catch (err) {
      return self;
    }

    if (!audioTest || typeof audioTest.canPlayType !== 'function') {
      return self;
    }

    const mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');
    const oldOpera = isOldOpera(self._navigator);
    const oldSafari = isOldSafari(self._navigator);

    self._codecs = {
      mp3: !!(!oldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
      mpeg: !!mpegTest,
      opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
      ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
      oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
      wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType('audio/wav')).replace(/^no$/, ''),
      aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
      caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
      m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      m4b: !!(audioTest.canPlayType('audio/x-m4b;') || audioTest.canPlayType('audio/m4b;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      weba: !!(!oldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
      webm: !!(!oldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
      dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
      flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
    };

    return self;
  }

  _unlockAudio(): void {
    const self = this;

    if (self._audioUnlocked || !self.ctx) {
      return;
    }

    self._audioUnlocked = false;
    self.autoUnlock = false;

    if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
      self._mobileUnloaded = true;
      self.unload();
    }

    self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

    const unlock = () => {
      while (self._html5AudioPool.length < self.html5PoolSize) {
        try {
          const audioNode = new (window as any).Audio();
          audioNode._unlocked = true;
          self._releaseHtml5Audio(audioNode);
        } catch (e) {
          self.noAudio = true;
          break;
        }
      }

      for (let i = 0; i < self._howls.length; i++) {
        if (!self._howls[i]._webAudio) {
          const ids = self._howls[i]._getSoundIds();
          for (let j = 0; j < ids.length; j++) {
            const sound = self._howls[i]._soundById(ids[j]);
            if (sound && sound._node && !(sound._node as any)._unlocked) {
              (sound._node as any)._unlocked = true;
              sound._node.load();
            }
          }
        }
      }

      self._autoResume();

      const source = self.ctx!.createBufferSource();
      source.buffer = self._scratchBuffer;
      source.connect(self.ctx!.destination);

      if (typeof source.start === 'undefined') {
        (source as any).noteOn(0);
      } else {
        source.start(0);
      }

      if (typeof self.ctx!.resume === 'function') {
        self.ctx!.resume();
      }

      source.onended = () => {
        source.disconnect(0);
        self._audioUnlocked = true;

        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('touchend', unlock, true);
        document.removeEventListener('click', unlock, true);
        document.removeEventListener('keydown', unlock, true);

        for (let i = 0; i < self._howls.length; i++) {
          self._howls[i]._emit('unlock');
        }
      };
    };

    document.addEventListener('touchstart', unlock as any, true);
    document.addEventListener('touchend', unlock as any, true);
    document.addEventListener('click', unlock as any, true);
    document.addEventListener('keydown', unlock as any, true);
  }

  _obtainHtml5Audio(): HTMLAudioElement {
    const self = this;

    if (self._html5AudioPool.length) {
      return self._html5AudioPool.pop()!;
    }

    const testPlay = new (window as any).Audio().play();
    if (testPlay && typeof Promise !== 'undefined' && (testPlay instanceof Promise || typeof (testPlay as any).then === 'function')) {
      (testPlay as any).catch(() => {
        console.warn('HTML5 Audio pool exhausted, returning potentially locked audio object.');
      });
    }

    return new (window as any).Audio();
  }

  _releaseHtml5Audio(audio: any): HowlerGlobal {
    const self = this;

    if (audio._unlocked) {
      self._html5AudioPool.push(audio);
    }

    return self;
  }

  _autoSuspend(): void {
    const self = this;

    if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
      return;
    }

    for (let i = 0; i < self._howls.length; i++) {
      if (self._howls[i]._webAudio) {
        for (let j = 0; j < self._howls[i]._sounds.length; j++) {
          if (!self._howls[i]._sounds[j]._paused) {
            return;
          }
        }
      }
    }

    if (self._suspendTimer) {
      clearTimeout(self._suspendTimer);
    }

    self._suspendTimer = setTimeout(() => {
      if (!self.autoSuspend) {
        return;
      }

      self._suspendTimer = null;
      self.state = 'suspending';

      const handleSuspension = () => {
        self.state = 'suspended';

        if (self._resumeAfterSuspend) {
          delete self._resumeAfterSuspend;
          self._autoResume();
        }
      };

      self.ctx!.suspend().then(handleSuspension, handleSuspension);
    }, 30000);
  }

  _autoResume(): void {
    const self = this;

    if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
      return;
    }

    if (self.state === 'running' && self.ctx.state !== 'interrupted' && self._suspendTimer) {
      clearTimeout(self._suspendTimer);
      self._suspendTimer = null;
    } else if (self.state === 'suspended' || (self.state === 'running' && self.ctx.state === 'interrupted')) {
      self.ctx.resume().then(() => {
        self.state = 'running';

        for (let i = 0; i < self._howls.length; i++) {
          self._howls[i]._emit('resume');
        }
      });

      if (self._suspendTimer) {
        clearTimeout(self._suspendTimer);
        self._suspendTimer = null;
      }
    } else if (self.state === 'suspending') {
      self._resumeAfterSuspend = true;
    }
  }
}

// Setup the global audio controller
const Howler = new HowlerGlobal();

class Sound {
  _parent: Howl;
  _muted: boolean = false;
  _loop: boolean = false;
  _volume: number = 1;
  _rate: number = 1;
  _seek: number = 0;
  _paused: boolean = true;
  _ended: boolean = true;
  _sprite: string = '__default';
  _id: number = 0;
  _node: HTMLAudioElement | any = null;
  _playStart: number = 0;
  _rateSeek: number = 0;
  _errorFn?: any;
  _loadFn?: any;
  _endFn?: any;
  _start?: number;
  _stop?: number;
  _panner?: PannerNode | StereoPannerNode;
  _fadeTo?: number;
  _interval?: ReturnType<typeof setInterval>;

  constructor(howl: Howl) {
    this._parent = howl;
    this.init();
  }

  init(): Sound {
    const self = this;
    const parent = self._parent;

    self._muted = parent._muted;
    self._loop = parent._loop;
    self._volume = parent._volume;
    self._rate = parent._rate;
    self._seek = 0;
    self._paused = true;
    self._ended = true;
    self._sprite = '__default';

    self._id = ++Howler._counter;

    parent._sounds.push(self);

    self.create();

    // Execute plugin hooks
    globalPluginManager.executeSoundCreate(self, parent);

    return self;
  }

  create(): Sound {
    const self = this;
    const parent = self._parent;
    const volume = Howler._muted || self._muted || parent._muted ? 0 : self._volume;

    if (parent._webAudio) {
      self._node = typeof Howler.ctx!.createGain === 'undefined' ? Howler.ctx!.createGainNode() : Howler.ctx!.createGain();
      self._node.gain.setValueAtTime(volume, Howler.ctx!.currentTime);
      self._node.paused = true;
      self._node.connect(Howler.masterGain);
    } else if (!Howler.noAudio) {
      self._node = Howler._obtainHtml5Audio();

      self._errorFn = self._errorListener.bind(self);
      self._node.addEventListener('error', self._errorFn, false);

      self._loadFn = self._loadListener.bind(self);
      self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);

      self._endFn = self._endListener.bind(self);
      self._node.addEventListener('ended', self._endFn, false);

      self._node.src = parent._src;
      self._node.preload = parent._preload === true ? 'auto' : parent._preload;
      const volumeOrHowler = Howler.volume();
      if (typeof volumeOrHowler === 'number') {
        self._node.volume = volume * volumeOrHowler;
      }

      self._node.load();
    }

    return self;
  }

  reset(): Sound {
    const self = this;
    const parent = self._parent;

    self._muted = parent._muted;
    self._loop = parent._loop;
    self._volume = parent._volume;
    self._rate = parent._rate;
    self._seek = 0;
    self._rateSeek = 0;
    self._paused = true;
    self._ended = true;
    self._sprite = '__default';

    self._id = ++Howler._counter;

    return self;
  }

  _errorListener(): void {
    const self = this;
    self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);
    self._node.removeEventListener('error', self._errorFn, false);
  }

  _loadListener(): void {
    const self = this;
    const parent = self._parent;

    parent._duration = Math.ceil(self._node.duration * 10) / 10;

    if (Object.keys(parent._sprite).length === 0) {
      parent._sprite = { __default: [0, parent._duration * 1000] };
    }

    if (parent._state !== 'loaded') {
      parent._state = 'loaded';
      parent._emit('load');
      parent._loadQueue();

      // Execute plugin hooks
      globalPluginManager.executeHowlLoad(parent);
    }

    self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
  }

  _endListener(): void {
    const self = this;
    const parent = self._parent;

    if (parent._duration === Infinity) {
      parent._duration = Math.ceil(self._node.duration * 10) / 10;

      if (parent._sprite.__default[1] === Infinity) {
        parent._sprite.__default[1] = parent._duration * 1000;
      }

      parent._ended(self);
    }

    self._node.removeEventListener('ended', self._endFn, false);
  }
}

class Howl {
  _autoplay: boolean = false;
  _format: string[] = [];
  _html5: boolean = false;
  _muted: boolean = false;
  _loop: boolean = false;
  _pool: number = 5;
  _preload: boolean | 'metadata' = true;
  _rate: number = 1;
  _sprite: Record<string, [number, number, boolean?]> = {};
  _src: string | string[] = [];
  _volume: number = 1;
  _xhr: { method: string; headers?: Record<string, string>; withCredentials: boolean } = { method: 'GET', withCredentials: false };
  _duration: number = 0;
  _state: string = 'unloaded';
  _sounds: Sound[] = [];
  _endTimers: Record<number, any> = {};
  _queue: QueueItem[] = [];
  _playLock: boolean = false;
  _webAudio: boolean = false;
  _onend: EventListener[] = [];
  _onfade: EventListener[] = [];
  _onload: EventListener[] = [];
  _onloaderror: EventListener[] = [];
  _onplayerror: EventListener[] = [];
  _onpause: EventListener[] = [];
  _onplay: EventListener[] = [];
  _onstop: EventListener[] = [];
  _onmute: EventListener[] = [];
  _onvolume: EventListener[] = [];
  _onrate: EventListener[] = [];
  _onseek: EventListener[] = [];
  _onunlock: EventListener[] = [];
  _onresume: EventListener[] = [];

  constructor(o: HowlOptions) {
    if (!o.src || o.src.length === 0) {
      console.error('An array of source files must be passed with any new Howl.');
      return;
    }

    this.init(o);
  }

  init(o: HowlOptions): Howl {
    const self = this;

    if (!Howler.ctx) {
      setupAudioContext();
    }

    self._autoplay = o.autoplay || false;
    self._format = typeof o.format !== 'string' ? o.format || [] : [o.format];
    self._html5 = o.html5 || false;
    self._muted = o.mute || false;
    self._loop = o.loop || false;
    self._pool = o.pool || 5;
    self._preload = typeof o.preload === 'boolean' || o.preload === 'metadata' ? o.preload : true;
    self._rate = o.rate || 1;
    self._sprite = o.sprite || {};
    self._src = typeof o.src !== 'string' ? o.src : [o.src];
    self._volume = o.volume !== undefined ? o.volume : 1;
    self._xhr = {
      method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : undefined,
      withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false
    };

    self._duration = 0;
    self._state = 'unloaded';
    self._sounds = [];
    self._endTimers = {};
    self._queue = [];
    self._playLock = false;

    self._onend = o.onend ? [{ fn: o.onend }] : [];
    self._onfade = o.onfade ? [{ fn: o.onfade }] : [];
    self._onload = o.onload ? [{ fn: o.onload }] : [];
    self._onloaderror = o.onloaderror ? [{ fn: o.onloaderror }] : [];
    self._onplayerror = o.onplayerror ? [{ fn: o.onplayerror }] : [];
    self._onpause = o.onpause ? [{ fn: o.onpause }] : [];
    self._onplay = o.onplay ? [{ fn: o.onplay }] : [];
    self._onstop = o.onstop ? [{ fn: o.onstop }] : [];
    self._onmute = o.onmute ? [{ fn: o.onmute }] : [];
    self._onvolume = o.onvolume ? [{ fn: o.onvolume }] : [];
    self._onrate = o.onrate ? [{ fn: o.onrate }] : [];
    self._onseek = o.onseek ? [{ fn: o.onseek }] : [];
    self._onunlock = o.onunlock ? [{ fn: o.onunlock }] : [];
    self._onresume = [];

    self._webAudio = Howler.usingWebAudio && !self._html5;

    if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
      Howler._unlockAudio();
    }

    Howler._howls.push(self);

    // Execute plugin hooks
    globalPluginManager.executeHowlCreate(self, o);

    if (self._autoplay) {
      self._queue.push({
        event: 'play',
        action: () => {
          self.play();
        }
      });
    }

    if (self._preload && self._preload !== 'none') {
      self.load();
    }

    return self;
  }

  load(): Howl {
    const self = this;
    let url: string | null = null;

    if (Howler.noAudio) {
      self._emit('loaderror', null, 'No audio support.');
      return self;
    }

    if (typeof self._src === 'string') {
      self._src = [self._src];
    }

    for (let i = 0; i < (self._src as string[]).length; i++) {
      let ext: string | null;
      const str = (self._src as string[])[i];

      if (self._format && self._format[i]) {
        ext = self._format[i];
      } else {
        if (typeof str !== 'string') {
          self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
          continue;
        }

        let extMatch = /^data:audio\/([^;,]+);/i.exec(str);
        if (!extMatch) {
          extMatch = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
        }

        ext = extMatch ? extMatch[1].toLowerCase() : null;
      }

      if (!ext) {
        console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
      }

      if (ext && Howler.codecs(ext)) {
        url = (self._src as string[])[i];
        break;
      }
    }

    if (!url) {
      self._emit('loaderror', null, 'No codec support for selected audio sources.');
      return self;
    }

    self._src = url;
    self._state = 'loading';

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
      self._html5 = true;
      self._webAudio = false;
    }

    new Sound(self);

    if (self._webAudio) {
      loadBuffer(self);
    }

    return self;
  }

  play(sprite?: string | number, internal?: boolean): number | null {
    const self = this;
    let id: number | null = null;

    if (typeof sprite === 'number') {
      id = sprite;
      sprite = undefined;
    } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
      return null;
    } else if (typeof sprite === 'undefined') {
      sprite = '__default';

      if (!self._playLock) {
        let num = 0;
        for (let i = 0; i < self._sounds.length; i++) {
          if (self._sounds[i]._paused && !self._sounds[i]._ended) {
            num++;
            id = self._sounds[i]._id;
          }
        }

        if (num === 1) {
          sprite = undefined;
        } else {
          id = null;
        }
      }
    }

    const sound = id ? self._soundById(id) : self._inactiveSound();

    if (!sound) {
      return null;
    }

    if (id && !sprite) {
      sprite = sound._sprite || '__default';
    }

    if (self._state !== 'loaded') {
      sound._sprite = sprite;
      sound._ended = false;

      const soundId = sound._id;
      self._queue.push({
        event: 'play',
        action: () => {
          self.play(soundId);
        }
      });

      return soundId;
    }

    if (id && !sound._paused) {
      if (!internal) {
        self._loadQueue('play');
      }

      return sound._id;
    }

    if (self._webAudio) {
      Howler._autoResume();
    }

    const seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite!][0] / 1000);
    const duration = Math.max(0, (self._sprite[sprite!][0] + self._sprite[sprite!][1]) / 1000 - seek);
    const timeout = (duration * 1000) / Math.abs(sound._rate);
    const start = self._sprite[sprite!][0] / 1000;
    const stop = (self._sprite[sprite!][0] + self._sprite[sprite!][1]) / 1000;
    sound._sprite = sprite!;

    sound._ended = false;

    const setParams = () => {
      sound._paused = false;
      sound._seek = seek;
      sound._start = start;
      sound._stop = stop;
      sound._loop = !!(sound._loop || self._sprite[sprite!][2]);
    };

    if (seek >= stop) {
      self._ended(sound);
      return sound._id;
    }

    const node = sound._node;

    if (self._webAudio) {
      const playWebAudio = () => {
        self._playLock = false;
        setParams();
        self._refreshBuffer(sound);

        const vol = sound._muted || self._muted ? 0 : sound._volume;
        node.gain.setValueAtTime(vol, Howler.ctx!.currentTime);
        sound._playStart = Howler.ctx!.currentTime;

        if (typeof (node.bufferSource as any).start === 'undefined') {
          (node.bufferSource as any).noteGrainOn(0, seek, sound._loop ? 86400 : duration);
        } else {
          (node.bufferSource as any).start(0, seek, sound._loop ? 86400 : duration);
        }

        if (timeout !== Infinity) {
          self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
        }

        if (!internal) {
          setTimeout(() => {
            self._emit('play', sound._id);
            self._loadQueue();
          }, 0);
        }
      };

      if (Howler.state === 'running' && Howler.ctx!.state !== 'interrupted') {
        playWebAudio();
      } else {
        self._playLock = true;
        self.once('resume', playWebAudio);
        self._clearTimer(sound._id);
      }
    } else {
      const playHtml5 = () => {
        node.currentTime = seek;
        node.muted = sound._muted || self._muted || Howler._muted || node.muted;
        const volume = Howler.volume();
        node.volume = sound._volume * (typeof volume === 'number' ? volume : 1);
        node.playbackRate = sound._rate;

        try {
          const play = node.play();

          if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof (play as any).then === 'function')) {
            self._playLock = true;

            setParams();

            (play as any)
              .then(() => {
                self._playLock = false;
                (node as any)._unlocked = true;
                if (!internal) {
                  self._emit('play', sound._id);
                } else {
                  self._loadQueue();
                }
              })
              .catch(() => {
                self._playLock = false;
                self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.');
                sound._ended = true;
                sound._paused = true;
              });
          } else if (!internal) {
            self._playLock = false;
            setParams();
            self._emit('play', sound._id);
          }

          node.playbackRate = sound._rate;

          if (node.paused) {
            self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.');
            return;
          }

          if (sprite !== '__default' || sound._loop) {
            self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
          } else {
            self._endTimers[sound._id] = () => {
              self._ended(sound);
              node.removeEventListener('ended', self._endTimers[sound._id], false);
            };
            node.addEventListener('ended', self._endTimers[sound._id], false);
          }
        } catch (err: unknown) {
          self._emit('playerror', sound._id, err instanceof Error ? err.message : String(err));
        }
      };

      if (node.src === 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA') {
        node.src = self._src;
        node.load();
      }

      const loadedNoReadyState = (typeof (window as any).ejecta !== 'undefined') || (!node.readyState && Howler._navigator && (Howler._navigator as any).isCocoonJS);
      if (node.readyState >= 3 || loadedNoReadyState) {
        playHtml5();
      } else {
        self._playLock = true;
        self._state = 'loading';

        const listener = () => {
          self._state = 'loaded';
          playHtml5();
          node.removeEventListener(Howler._canPlayEvent, listener, false);
        };
        node.addEventListener(Howler._canPlayEvent, listener as any, false);

        self._clearTimer(sound._id);
      }
    }

    return sound._id;
  }

  pause(id?: number): Howl {
    const self = this;

    if (self._state !== 'loaded' || self._playLock) {
      self._queue.push({
        event: 'pause',
        action: () => {
          self.pause(id);
        }
      });

      return self;
    }

    const ids = self._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      self._clearTimer(ids[i]);

      const sound = self._soundById(ids[i]);

      if (sound && !sound._paused) {
        sound._seek = self.seek(ids[i]) as number;
        sound._rateSeek = 0;
        sound._paused = true;

        self._stopFade(ids[i]);

        if (sound._node) {
          if (self._webAudio) {
            if (!sound._node.bufferSource) {
              continue;
            }

            if (typeof (sound._node.bufferSource as any).stop === 'undefined') {
              (sound._node.bufferSource as any).noteOff(0);
            } else {
              (sound._node.bufferSource as any).stop(0);
            }

            self._cleanBuffer(sound._node);
          } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
            sound._node.pause();
          }
        }
      }

      if (!arguments[1]) {
        self._emit('pause', sound ? sound._id : null);
      }
    }

    return self;
  }

  stop(id?: number, internal?: boolean): Howl {
    const self = this;

    if (self._state !== 'loaded' || self._playLock) {
      self._queue.push({
        event: 'stop',
        action: () => {
          self.stop(id);
        }
      });

      return self;
    }

    const ids = self._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      self._clearTimer(ids[i]);

      const sound = self._soundById(ids[i]);

      if (sound) {
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._paused = true;
        sound._ended = true;

        self._stopFade(ids[i]);

        if (sound._node) {
          if (self._webAudio) {
            if (sound._node.bufferSource) {
              if (typeof (sound._node.bufferSource as any).stop === 'undefined') {
                (sound._node.bufferSource as any).noteOff(0);
              } else {
                (sound._node.bufferSource as any).stop(0);
              }

              self._cleanBuffer(sound._node);
            }
          } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
            sound._node.currentTime = sound._start || 0;
            sound._node.pause();

            if (sound._node.duration === Infinity) {
              self._clearSound(sound._node);
            }
          }
        }

        if (!internal) {
          self._emit('stop', sound._id);
        }
      }
    }

    return self;
  }

  mute(muted: boolean, id?: number): boolean | Howl {
    const self = this;

    if (self._state !== 'loaded' || self._playLock) {
      self._queue.push({
        event: 'mute',
        action: () => {
          self.mute(muted, id);
        }
      });

      return self;
    }

    if (typeof id === 'undefined') {
      if (typeof muted === 'boolean') {
        self._muted = muted;
      } else {
        return self._muted;
      }
    }

    const ids = self._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      const sound = self._soundById(ids[i]);

      if (sound) {
        sound._muted = muted;

        if (sound._interval) {
          self._stopFade(sound._id);
        }

        if (self._webAudio && sound._node) {
          sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx!.currentTime);
        } else if (sound._node) {
          sound._node.muted = Howler._muted ? true : muted;
        }

        self._emit('mute', sound._id);
      }
    }

    return self;
  }

  volume(): number;
  volume(vol: number): Howl;
  volume(vol?: number): number | Howl {
    const self = this;
    const args = arguments;
    let volume: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      return self._volume;
    } else if (args.length === 1 || (args.length === 2 && typeof args[1] === 'undefined')) {
      const ids = self._getSoundIds();
      const index = ids.indexOf(args[0] as any);
      if (index >= 0) {
        id = parseInt(args[0] as any, 10);
      } else {
        volume = parseFloat(args[0] as any);
      }
    } else if (args.length >= 2) {
      volume = parseFloat(args[0] as any);
      id = parseInt(args[1] as any, 10);
    }

    let sound;
    if (typeof volume !== 'undefined' && volume >= 0 && volume <= 1) {
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'volume',
          action: () => {
            self.volume.apply(self, args as any);
          }
        });

        return self;
      }

      if (typeof id === 'undefined') {
        self._volume = volume;
      }

      id = self._getSoundIds(id);
      for (let i = 0; i < (id as any).length; i++) {
        sound = self._soundById((id as any)[i]);

        if (sound) {
          sound._volume = volume;

          if (!(args as any)[2]) {
            self._stopFade((id as any)[i]);
          }

          if (self._webAudio && sound._node && !sound._muted) {
            sound._node.gain.setValueAtTime(volume, Howler.ctx!.currentTime);
          } else if (sound._node && !sound._muted) {
            const volumeMultiplierOrGlobal = Howler.volume();
            if (typeof volumeMultiplierOrGlobal === 'number') {
              sound._node.volume = volume * volumeMultiplierOrGlobal;
            }
          }

          self._emit('volume', sound._id);
        }
      }
    } else {
      sound = id ? self._soundById(id) : self._sounds[0];
      return sound ? sound._volume : 0;
    }

    return self;
  }

  fade(from: number, to: number, len: number, id?: number): Howl {
    const self = this;

    if (self._state !== 'loaded' || self._playLock) {
      self._queue.push({
        event: 'fade',
        action: () => {
          self.fade(from, to, len, id);
        }
      });

      return self;
    }

    from = Math.min(Math.max(0, parseFloat(from as any)), 1);
    to = Math.min(Math.max(0, parseFloat(to as any)), 1);
    len = parseFloat(len as any);

    self.volume(from, id);

    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      const sound = self._soundById(ids[i]);

      if (sound) {
        if (!id) {
          self._stopFade(ids[i]);
        }

        if (self._webAudio && !sound._muted) {
          const currentTime = Howler.ctx!.currentTime;
          const end = currentTime + len / 1000;
          sound._volume = from;
          sound._node.gain.setValueAtTime(from, currentTime);
          sound._node.gain.linearRampToValueAtTime(to, end);
        }

        self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
      }
    }

    return self;
  }

  _startFadeInterval(sound: Sound, from: number, to: number, len: number, id: number, isGroup: boolean): void {
    const self = this;
    let vol = from;
    const diff = to - from;
    const steps = Math.abs(diff / 0.01);
    const stepLen = Math.max(4, steps > 0 ? len / steps : len);
    let lastTick = Date.now();

    sound._fadeTo = to;

    sound._interval = setInterval(() => {
      const tick = (Date.now() - lastTick) / len;
      lastTick = Date.now();
      vol += diff * tick;

      vol = Math.round(vol * 100) / 100;

      if (diff < 0) {
        vol = Math.max(to, vol);
      } else {
        vol = Math.min(to, vol);
      }

      if (self._webAudio) {
        sound._volume = vol;
      } else {
        self.volume(vol, sound._id, true);
      }

      if (isGroup) {
        self._volume = vol;
      }

      if ((to < from && vol <= to) || (to > from && vol >= to)) {
        clearInterval(sound._interval as any);
        sound._interval = undefined;
        sound._fadeTo = undefined;
        self.volume(to, sound._id);
        self._emit('fade', sound._id);
      }
    }, stepLen);
  }

  _stopFade(id: number): Howl {
    const self = this;
    const sound = self._soundById(id);

    if (sound && sound._interval) {
      if (self._webAudio) {
        sound._node.gain.cancelScheduledValues(Howler.ctx!.currentTime);
      }

      clearInterval(sound._interval as any);
      sound._interval = undefined;
      self.volume(sound._fadeTo as number, id);
      sound._fadeTo = undefined;
      self._emit('fade', id);
    }

    return self;
  }

  loop(): boolean;
  loop(loop: boolean): Howl;
  loop(loop?: boolean): boolean | Howl {
    const self = this;
    const args = arguments;
    let loopVal: boolean | undefined;
    let id: number | undefined;
    let sound: Sound | null = null;

    if (args.length === 0) {
      return self._loop;
    } else if (args.length === 1) {
      if (typeof args[0] === 'boolean') {
        loopVal = args[0] as boolean;
        self._loop = loopVal;
      } else {
        sound = self._soundById(parseInt(args[0] as any, 10));
        return sound ? sound._loop : false;
      }
    } else if (args.length === 2) {
      loopVal = args[0] as boolean;
      id = parseInt(args[1] as any, 10);
    }

    const ids = self._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      sound = self._soundById(ids[i]);

      if (sound) {
        sound._loop = loopVal as boolean;
        if (self._webAudio && sound._node && (sound._node.bufferSource as any)) {
          (sound._node.bufferSource as any).loop = loopVal;
          if (loopVal) {
            (sound._node.bufferSource as any).loopStart = sound._start || 0;
            (sound._node.bufferSource as any).loopEnd = sound._stop;

            if (self.playing(ids[i])) {
              self.pause(ids[i], true);
              self.play(ids[i], true);
            }
          }
        }
      }
    }

    return self;
  }

  rate(): number;
  rate(rate: number): Howl;
  rate(rate?: number): number | Howl {
    const self = this;
    const args = arguments;
    let rateVal: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      id = self._sounds[0]._id;
    } else if (args.length === 1) {
      const ids = self._getSoundIds();
      const index = ids.indexOf(args[0] as any);
      if (index >= 0) {
        id = parseInt(args[0] as any, 10);
      } else {
        rateVal = parseFloat(args[0] as any);
      }
    } else if (args.length === 2) {
      rateVal = parseFloat(args[0] as any);
      id = parseInt(args[1] as any, 10);
    }

    let sound;
    if (typeof rateVal === 'number') {
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'rate',
          action: () => {
            self.rate.apply(self, args as any);
          }
        });

        return self;
      }

      if (typeof id === 'undefined') {
        self._rate = rateVal;
      }

      id = self._getSoundIds(id);
      for (let i = 0; i < (id as any).length; i++) {
        sound = self._soundById((id as any)[i]);

        if (sound) {
          if (self.playing((id as any)[i])) {
            sound._rateSeek = self.seek((id as any)[i]) as number;
            sound._playStart = self._webAudio ? Howler.ctx!.currentTime : sound._playStart;
          }
          sound._rate = rateVal;

          if (self._webAudio && sound._node && (sound._node.bufferSource as any)) {
            (sound._node.bufferSource as any).playbackRate.setValueAtTime(rateVal, Howler.ctx!.currentTime);
          } else if (sound._node) {
            sound._node.playbackRate = rateVal;
          }

          const seek = self.seek((id as any)[i]) as number;
          const duration = (self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000 - seek;
          const timeout = (duration * 1000) / Math.abs(sound._rate);

          if (self._endTimers[(id as any)[i]] || !sound._paused) {
            self._clearTimer((id as any)[i]);
            self._endTimers[(id as any)[i]] = setTimeout(self._ended.bind(self, sound), timeout);
          }

          self._emit('rate', sound._id);
        }
      }
    } else {
      sound = self._soundById(id);
      return sound ? sound._rate : self._rate;
    }

    return self;
  }

  seek(): number;
  seek(seek: number): Howl;
  seek(seek?: number): number | Howl {
    const self = this;
    const args = arguments;
    let seekVal: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      if (self._sounds.length) {
        id = self._sounds[0]._id;
      }
    } else if (args.length === 1) {
      const ids = self._getSoundIds();
      const index = ids.indexOf(args[0] as any);
      if (index >= 0) {
        id = parseInt(args[0] as any, 10);
      } else if (self._sounds.length) {
        id = self._sounds[0]._id;
        seekVal = parseFloat(args[0] as any);
      }
    } else if (args.length === 2) {
      seekVal = parseFloat(args[0] as any);
      id = parseInt(args[1] as any, 10);
    }

    if (typeof id === 'undefined') {
      return 0;
    }

    if (typeof seekVal === 'number' && (self._state !== 'loaded' || self._playLock)) {
      self._queue.push({
        event: 'seek',
        action: () => {
          self.seek.apply(self, args as any);
        }
      });

      return self;
    }

    const sound = self._soundById(id);

    if (sound) {
      if (typeof seekVal === 'number' && seekVal >= 0) {
        const playing = self.playing(id);
        if (playing) {
          self.pause(id, true);
        }

        sound._seek = seekVal;
        sound._ended = false;
        self._clearTimer(id);

        if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
          sound._node.currentTime = seekVal;
        }

        const seekAndEmit = () => {
          if (playing) {
            self.play(id, true);
          }

          self._emit('seek', id);
        };

        if (playing && !self._webAudio) {
          const emitSeek = () => {
            if (!self._playLock) {
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
        if (self._webAudio) {
          const realTime = self.playing(id) ? Howler.ctx!.currentTime - sound._playStart : 0;
          const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
          return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
        } else {
          return sound._node.currentTime;
        }
      }
    }

    return self;
  }

  playing(id?: number): boolean {
    const self = this;

    if (typeof id === 'number') {
      const sound = self._soundById(id);
      return sound ? !sound._paused : false;
    }

    for (let i = 0; i < self._sounds.length; i++) {
      if (!self._sounds[i]._paused) {
        return true;
      }
    }

    return false;
  }

  duration(id?: number): number {
    const self = this;
    let duration = self._duration;

    const sound = self._soundById(id);
    if (sound) {
      duration = self._sprite[sound._sprite][1] / 1000;
    }

    return duration;
  }

  state(): string {
    return this._state;
  }

  unload(): null {
    const self = this;

    // Execute plugin hooks before destruction
    globalPluginManager.executeHowlDestroy(self);

    const sounds = self._sounds;
    for (let i = 0; i < sounds.length; i++) {
      if (!sounds[i]._paused) {
        self.stop(sounds[i]._id);
      }

      if (!self._webAudio) {
        self._clearSound(sounds[i]._node);

        sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
        sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);
        sounds[i]._node.removeEventListener('ended', sounds[i]._endFn, false);

        Howler._releaseHtml5Audio(sounds[i]._node);
      }

      delete sounds[i]._node;

      self._clearTimer(sounds[i]._id);
    }

    const index = Howler._howls.indexOf(self);
    if (index >= 0) {
      Howler._howls.splice(index, 1);
    }

    let remCache = true;
    for (let i = 0; i < Howler._howls.length; i++) {
      if (Howler._howls[i]._src === self._src || (self._src as string).indexOf(Howler._howls[i]._src as string) >= 0) {
        remCache = false;
        break;
      }
    }

    if (cache && remCache) {
      delete cache[self._src as string];
    }

    Howler.noAudio = false;

    self._state = 'unloaded';
    self._sounds = [];

    return null;
  }

  on(event: string, fn: (...args: any[]) => void, id?: number, once?: boolean): Howl {
    const self = this;
    const events = (self as any)['_on' + event];

    if (typeof fn === 'function') {
      events.push(once ? { id, fn, once } : { id, fn });
    }

    return self;
  }

  off(event: string, fn?: (...args: any[]) => void, id?: number): Howl {
    const self = this;
    const events = (self as any)['_on' + event];
    let i = 0;

    if (typeof fn === 'number') {
      id = fn;
      fn = undefined;
    }

    if (fn || id) {
      for (i = 0; i < events.length; i++) {
        const isId = id === events[i].id;
        if ((fn === events[i].fn && isId) || (!fn && isId)) {
          events.splice(i, 1);
          break;
        }
      }
    } else if (event) {
      (self as any)['_on' + event] = [];
    } else {
      const keys = Object.keys(self);
      for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('_on') === 0 && Array.isArray((self as any)[keys[i]])) {
          (self as any)[keys[i]] = [];
        }
      }
    }

    return self;
  }

  once(event: string, fn: (...args: any[]) => void, id?: number): Howl {
    const self = this;

    self.on(event, fn, id, true);

    return self;
  }

  _emit(event: string, id?: number | null, msg?: string): Howl {
    const self = this;
    const events = (self as any)['_on' + event];

    for (let i = events.length - 1; i >= 0; i--) {
      if (!events[i].id || events[i].id === id || event === 'load') {
        setTimeout(
          function(fn) {
            fn.call(this, id, msg);
          }.bind(self, events[i].fn),
          0
        );

        if (events[i].once) {
          self.off(event, events[i].fn, events[i].id);
        }
      }
    }

    self._loadQueue(event);

    return self;
  }

  _loadQueue(event?: string): Howl {
    const self = this;

    if (self._queue.length > 0) {
      const task = self._queue[0];

      if (task.event === event) {
        self._queue.shift();
        self._loadQueue();
      }

      if (!event) {
        task.action();
      }
    }

    return self;
  }

  _ended(sound: Sound): Howl {
    const self = this;
    const sprite = sound._sprite;

    if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop!) {
      setTimeout(self._ended.bind(self, sound), 100);
      return self;
    }

    const loop = !!(sound._loop || self._sprite[sprite][2]);

    self._emit('end', sound._id);

    if (!self._webAudio && loop) {
      self.stop(sound._id, true).play(sound._id);
    }

    if (self._webAudio && loop) {
      self._emit('play', sound._id);
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      sound._playStart = Howler.ctx!.currentTime;

      const timeout = ((sound._stop! - (sound._start || 0)) * 1000) / Math.abs(sound._rate);
      self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
    }

    if (self._webAudio && !loop) {
      sound._paused = true;
      sound._ended = true;
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      self._clearTimer(sound._id);

      self._cleanBuffer(sound._node);

      Howler._autoSuspend();
    }

    if (!self._webAudio && !loop) {
      self.stop(sound._id, true);
    }

    return self;
  }

  _clearTimer(id: number): Howl {
    const self = this;

    if (self._endTimers[id]) {
      if (typeof self._endTimers[id] !== 'function') {
        clearTimeout(self._endTimers[id]);
      } else {
        const sound = self._soundById(id);
        if (sound && sound._node) {
          sound._node.removeEventListener('ended', self._endTimers[id], false);
        }
      }

      delete self._endTimers[id];
    }

    return self;
  }

  _soundById(id: number): Sound | null {
    const self = this;

    for (let i = 0; i < self._sounds.length; i++) {
      if (id === self._sounds[i]._id) {
        return self._sounds[i];
      }
    }

    return null;
  }

  _inactiveSound(): Sound {
    const self = this;

    self._drain();

    for (let i = 0; i < self._sounds.length; i++) {
      if (self._sounds[i]._ended) {
        return self._sounds[i].reset();
      }
    }

    return new Sound(self);
  }

  _drain(): void {
    const self = this;
    const limit = self._pool;
    let cnt = 0;

    if (self._sounds.length < limit) {
      return;
    }

    for (let i = 0; i < self._sounds.length; i++) {
      if (self._sounds[i]._ended) {
        cnt++;
      }
    }

    for (let i = self._sounds.length - 1; i >= 0; i--) {
      if (cnt <= limit) {
        return;
      }

      if (self._sounds[i]._ended) {
        if (self._webAudio && self._sounds[i]._node) {
          self._sounds[i]._node.disconnect(0);
        }

        self._sounds.splice(i, 1);
        cnt--;
      }
    }
  }

  _getSoundIds(id?: number): number[] {
    const self = this;

    if (typeof id === 'undefined') {
      const ids: number[] = [];
      for (let i = 0; i < self._sounds.length; i++) {
        ids.push(self._sounds[i]._id);
      }

      return ids;
    } else {
      return [id];
    }
  }

  _refreshBuffer(sound: Sound): Howl {
    const self = this;

    sound._node.bufferSource = Howler.ctx!.createBufferSource();
    sound._node.bufferSource.buffer = cache[self._src as string];

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
    sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx!.currentTime);

    return self;
  }

  _cleanBuffer(node: any): Howl {
    const self = this;
    const isIOS = isAppleVendor(Howler._navigator);

    if (!node.bufferSource) {
      return self;
    }

    if (Howler._scratchBuffer && node.bufferSource) {
      node.bufferSource.onended = null;
      node.bufferSource.disconnect(0);
      if (isIOS) {
        try {
          node.bufferSource.buffer = Howler._scratchBuffer;
        } catch (e) {}
      }
    }
    node.bufferSource = null;

    return self;
  }

  _clearSound(node: HTMLAudioElement): void {
    if (!isIE(Howler._navigator)) {
      node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    }
  }
}

/**
 * Type declaration for Howler with optional spatial audio mixin methods.
 * These methods are added dynamically by the SpatialAudioPlugin at runtime.
 */
export interface HowlerInstance extends HowlerGlobal {
  // Optional spatial audio methods added by plugin
  _pos?: [number, number, number];
  _orientation?: [number, number, number, number, number, number];
  pos?(x?: number, y?: number, z?: number): any;
  orientation?(x?: number, y?: number, z?: number, xUp?: number, yUp?: number, zUp?: number): any;
  stereo?(pan?: number): any;
}

/**
 * Type declaration for Howl with optional spatial audio mixin methods.
 * These methods are added dynamically by the SpatialAudioPlugin at runtime.
 */
export interface HowlInstance extends Howl {
  // Optional spatial audio properties added by plugin
  _pos?: [number, number, number] | null;
  _orientation?: [number, number, number];
  _stereo?: number | null;
  _pannerAttr?: any;

  // Optional spatial audio methods added by plugin
  pos?(x?: number, y?: number, z?: number, id?: number): any;
  orientation?(x?: number, y?: number, z?: number, id?: number): any;
  stereo?(pan?: number, id?: number): any;
  pannerAttr?(o?: any, id?: number): any;
}

// Export for ESM
export * from './types';
export { Howl, Howler, Sound };
export default { Howler, Howl, Sound };
