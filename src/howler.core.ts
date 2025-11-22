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
    // Initialize all properties (explicit initialization ensures correct values)
    this._counter = 1000;
    this._html5AudioPool = [];
    this.html5PoolSize = 10;
    this._codecs = {};
    this._howls = [];
    this._muted = false;
    this._volume = 1;
    this._canPlayEvent = 'canplaythrough';
    this._navigator = typeof window !== 'undefined' && window.navigator ? window.navigator : null;
    this.masterGain = null;
    this.noAudio = false;
    this.usingWebAudio = true;
    this.autoSuspend = true;
    this.ctx = null;
    this.autoUnlock = true;

    // Setup Howler (codecs, audio context, etc.)
    this._setup();

    // Register the Howler instance with the plugin manager
    // This triggers onHowlerInit hooks for any plugins already registered
    globalPluginManager.setHowlerInstance(this);
  }

  volume(vol?: number): number | HowlerGlobal {
    if (vol !== undefined) {
      vol = parseFloat(vol as any);

      if (!this.ctx) {
        setupAudioContext();
      }

      if (typeof vol === 'number' && vol >= 0 && vol <= 1) {
        this._volume = vol;

        if (this._muted) {
          return this;
        }

        if (this.usingWebAudio) {
          this.masterGain!.gain.setValueAtTime(vol, Howler.ctx!.currentTime);
        }

        for (let i = 0; i < this._howls.length; i++) {
          if (!this._howls[i]._webAudio) {
            const ids = this._howls[i]._getSoundIds();
            for (let j = 0; j < ids.length; j++) {
              const sound = this._howls[i]._soundById(ids[j]);
              if (sound && sound._node) {
                sound._node.volume = sound._volume * vol;
              }
            }
          }
        }

        return this;
      }
    }

    return this._volume;
  }

  mute(muted: boolean): HowlerGlobal {
    if (!this.ctx) {
      setupAudioContext();
    }

    this._muted = muted;

    if (this.usingWebAudio) {
      this.masterGain!.gain.setValueAtTime(muted ? 0 : this._volume, Howler.ctx!.currentTime);
    }

    for (let i = 0; i < this._howls.length; i++) {
      if (!this._howls[i]._webAudio) {
        const ids = this._howls[i]._getSoundIds();
        for (let j = 0; j < ids.length; j++) {
          const sound = this._howls[i]._soundById(ids[j]);
          if (sound && sound._node) {
            sound._node.muted = muted ? true : sound._muted;
          }
        }
      }
    }

    return this;
  }

  stop(): HowlerGlobal {
    for (let i = 0; i < this._howls.length; i++) {
      this._howls[i].stop();
    }

    return this;
  }

  unload(): HowlerGlobal {
    for (let i = this._howls.length - 1; i >= 0; i--) {
      this._howls[i].unload();
    }

    if (this.usingWebAudio && this.ctx && typeof this.ctx.close !== 'undefined') {
      this.ctx.close();
      this.ctx = null;
      setupAudioContext();
    }

    return this;
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
    this.state = this.ctx ? this.ctx.state || 'suspended' : 'suspended';
    this._autoSuspend();

    if (!this.usingWebAudio) {
      if (typeof window.Audio !== 'undefined') {
        try {
          const test = new window.Audio();
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

    try {
      const test = new window.Audio();
      if (test.muted) {
        this.noAudio = true;
      }
    } catch (e) {}

    if (!this.noAudio) {
      this._setupCodecs();
    }

    return this;
  }

  _setupCodecs(): HowlerGlobal {
    let audioTest: any = null;

    try {
      audioTest = typeof window.Audio !== 'undefined' ? new window.Audio() : null;
    } catch (err) {
      return this;
    }

    if (!audioTest || typeof audioTest.canPlayType !== 'function') {
      return this;
    }

    const mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');
    const oldOpera = isOldOpera(this._navigator);
    const oldSafari = isOldSafari(this._navigator);

    this._codecs = {
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

    return this;
  }

  _unlockAudio(): void {
    if (this._audioUnlocked || !this.ctx) {
      return;
    }

    this._audioUnlocked = false;
    this.autoUnlock = false;

    if (!this._mobileUnloaded && this.ctx.sampleRate !== 44100) {
      this._mobileUnloaded = true;
      this.unload();
    }

    this._scratchBuffer = this.ctx.createBuffer(1, 1, 22050);

    const unlock = () => {
      while (this._html5AudioPool.length < this.html5PoolSize) {
        try {
          const audioNode = new (window as any).Audio();
          audioNode._unlocked = true;
          this._releaseHtml5Audio(audioNode);
        } catch (e) {
          this.noAudio = true;
          break;
        }
      }

      for (let i = 0; i < this._howls.length; i++) {
        if (!this._howls[i]._webAudio) {
          const ids = this._howls[i]._getSoundIds();
          for (let j = 0; j < ids.length; j++) {
            const sound = this._howls[i]._soundById(ids[j]);
            if (sound && sound._node && !(sound._node as any)._unlocked) {
              (sound._node as any)._unlocked = true;
              sound._node.load();
            }
          }
        }
      }

      this._autoResume();

      const source = this.ctx!.createBufferSource();
      source.buffer = this._scratchBuffer;
      source.connect(this.ctx!.destination);

      if (typeof source.start === 'undefined') {
        (source as any).noteOn(0);
      } else {
        source.start(0);
      }

      if (typeof this.ctx!.resume === 'function') {
        this.ctx!.resume();
      }

      source.onended = () => {
        source.disconnect(0);
        this._audioUnlocked = true;

        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('touchend', unlock, true);
        document.removeEventListener('click', unlock, true);
        document.removeEventListener('keydown', unlock, true);

        for (let i = 0; i < this._howls.length; i++) {
          this._howls[i]._emit('unlock');
        }
      };
    };

    document.addEventListener('touchstart', unlock as any, true);
    document.addEventListener('touchend', unlock as any, true);
    document.addEventListener('click', unlock as any, true);
    document.addEventListener('keydown', unlock as any, true);
  }

  _obtainHtml5Audio(): HTMLAudioElement {
    if (this._html5AudioPool.length) {
      return this._html5AudioPool.pop()!;
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
    if (audio._unlocked) {
      this._html5AudioPool.push(audio);
    }

    return this;
  }

  _autoSuspend(): void {
    if (!this.autoSuspend || !this.ctx || typeof this.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
      return;
    }

    for (let i = 0; i < this._howls.length; i++) {
      if (this._howls[i]._webAudio) {
        for (let j = 0; j < this._howls[i]._sounds.length; j++) {
          if (!this._howls[i]._sounds[j]._paused) {
            return;
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
      this.state = 'suspending';

      const handleSuspension = () => {
        this.state = 'suspended';

        if (this._resumeAfterSuspend) {
          delete this._resumeAfterSuspend;
          this._autoResume();
        }
      };

      this.ctx!.suspend().then(handleSuspension, handleSuspension);
    }, 30000);
  }

  _autoResume(): void {
    if (!this.ctx || typeof this.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
      return;
    }

    if (this.state === 'running' && this.ctx.state !== 'interrupted' && this._suspendTimer) {
      clearTimeout(this._suspendTimer);
      this._suspendTimer = null;
    } else if (this.state === 'suspended' || (this.state === 'running' && this.ctx.state === 'interrupted')) {
      this.ctx.resume().then(() => {
        this.state = 'running';

        for (let i = 0; i < this._howls.length; i++) {
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
    
    const parent = this._parent;

    this._muted = parent._muted;
    this._loop = parent._loop;
    this._volume = parent._volume;
    this._rate = parent._rate;
    this._seek = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = '__default';

    this._id = ++Howler._counter;

    parent._sounds.push(this);

    this.create();

    // Execute plugin hooks
    globalPluginManager.executeSoundCreate(this, parent);

    return this;
  }

  create(): Sound {
    
    const parent = this._parent;
    const volume = Howler._muted || this._muted || parent._muted ? 0 : this._volume;

    if (parent._webAudio) {
      this._node = typeof Howler.ctx!.createGain === 'undefined' ? Howler.ctx!.createGainNode() : Howler.ctx!.createGain();
      this._node.gain.setValueAtTime(volume, Howler.ctx!.currentTime);
      this._node.paused = true;
      this._node.connect(Howler.masterGain);
    } else if (!Howler.noAudio) {
      this._node = Howler._obtainHtml5Audio();

      this._errorFn = this._errorListener.bind(this);
      this._node.addEventListener('error', this._errorFn, false);

      this._loadFn = this._loadListener.bind(this);
      this._node.addEventListener(Howler._canPlayEvent, this._loadFn, false);

      this._endFn = this._endListener.bind(this);
      this._node.addEventListener('ended', this._endFn, false);

      this._node.src = parent._src;
      this._node.preload = parent._preload === true ? 'auto' : parent._preload;
      const volumeOrHowler = Howler.volume();
      if (typeof volumeOrHowler === 'number') {
        this._node.volume = volume * volumeOrHowler;
      }

      this._node.load();
    }

    return this;
  }

  reset(): Sound {
    
    const parent = this._parent;

    this._muted = parent._muted;
    this._loop = parent._loop;
    this._volume = parent._volume;
    this._rate = parent._rate;
    this._seek = 0;
    this._rateSeek = 0;
    this._paused = true;
    this._ended = true;
    this._sprite = '__default';

    this._id = ++Howler._counter;

    return this;
  }

  _errorListener(): void {
    
    this._parent._emit('loaderror', this._id, this._node.error ? this._node.error.code : 0);
    this._node.removeEventListener('error', this._errorFn, false);
  }

  _loadListener(): void {
    
    const parent = this._parent;

    parent._duration = Math.ceil(this._node.duration * 10) / 10;

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

    this._node.removeEventListener(Howler._canPlayEvent, this._loadFn, false);
  }

  _endListener(): void {
    
    const parent = this._parent;

    if (parent._duration === Infinity) {
      parent._duration = Math.ceil(this._node.duration * 10) / 10;

      if (parent._sprite.__default[1] === Infinity) {
        parent._sprite.__default[1] = parent._duration * 1000;
      }

      parent._ended(this);
    }

    this._node.removeEventListener('ended', this._endFn, false);
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
    if (!Howler.ctx) {
      setupAudioContext();
    }

    this._autoplay = o.autoplay || false;
    this._format = typeof o.format !== 'string' ? o.format || [] : [o.format];
    this._html5 = o.html5 || false;
    this._muted = o.mute || false;
    this._loop = o.loop || false;
    this._pool = o.pool || 5;
    this._preload = typeof o.preload === 'boolean' || o.preload === 'metadata' ? o.preload : true;
    this._rate = o.rate || 1;
    this._sprite = o.sprite || {};
    this._src = typeof o.src !== 'string' ? o.src : [o.src];
    this._volume = o.volume !== undefined ? o.volume : 1;
    this._xhr = {
      method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : undefined,
      withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false
    };

    this._duration = 0;
    this._state = 'unloaded';
    this._sounds = [];
    this._endTimers = {};
    this._queue = [];
    this._playLock = false;

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

    this._webAudio = Howler.usingWebAudio && !this._html5;

    if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
      Howler._unlockAudio();
    }

    Howler._howls.push(this);

    // Execute plugin hooks
    globalPluginManager.executeHowlCreate(this, o);

    if (this._autoplay) {
      this._queue.push({
        event: 'play',
        action: () => {
          this.play();
        }
      });
    }

    if (this._preload && this._preload !== 'none') {
      this.load();
    }

    return this;
  }

  load(): Howl {
    let url: string | null = null;

    if (Howler.noAudio) {
      this._emit('loaderror', null, 'No audio support.');
      return this;
    }

    if (typeof this._src === 'string') {
      this._src = [this._src];
    }

    for (let i = 0; i < (this._src as string[]).length; i++) {
      let ext: string | null;
      const str = (this._src as string[])[i];

      if (this._format && this._format[i]) {
        ext = this._format[i];
      } else {
        if (typeof str !== 'string') {
          this._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
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
        url = (this._src as string[])[i];
        break;
      }
    }

    if (!url) {
      this._emit('loaderror', null, 'No codec support for selected audio sources.');
      return this;
    }

    this._src = url;
    this._state = 'loading';

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
      this._html5 = true;
      this._webAudio = false;
    }

    new Sound(this);

    if (this._webAudio) {
      loadBuffer(this);
    }

    return this;
  }

  play(sprite?: string | number, internal?: boolean): number | null {
    
    let id: number | null = null;

    if (typeof sprite === 'number') {
      id = sprite;
      sprite = undefined;
    } else if (typeof sprite === 'string' && this._state === 'loaded' && !this._sprite[sprite]) {
      return null;
    } else if (typeof sprite === 'undefined') {
      sprite = '__default';

      if (!this._playLock) {
        let num = 0;
        for (let i = 0; i < this._sounds.length; i++) {
          if (this._sounds[i]._paused && !this._sounds[i]._ended) {
            num++;
            id = this._sounds[i]._id;
          }
        }

        if (num === 1) {
          sprite = undefined;
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
      sprite = sound._sprite || '__default';
    }

    if (this._state !== 'loaded') {
      sound._sprite = sprite;
      sound._ended = false;

      const soundId = sound._id;
      this._queue.push({
        event: 'play',
        action: () => {
          this.play(soundId);
        }
      });

      return soundId;
    }

    if (id && !sound._paused) {
      if (!internal) {
        this._loadQueue('play');
      }

      return sound._id;
    }

    if (this._webAudio) {
      Howler._autoResume();
    }

    const seek = Math.max(0, sound._seek > 0 ? sound._seek : this._sprite[sprite!][0] / 1000);
    const duration = Math.max(0, (this._sprite[sprite!][0] + this._sprite[sprite!][1]) / 1000 - seek);
    const timeout = (duration * 1000) / Math.abs(sound._rate);
    const start = this._sprite[sprite!][0] / 1000;
    const stop = (this._sprite[sprite!][0] + this._sprite[sprite!][1]) / 1000;
    sound._sprite = sprite!;

    sound._ended = false;

    const setParams = () => {
      sound._paused = false;
      sound._seek = seek;
      sound._start = start;
      sound._stop = stop;
      sound._loop = !!(sound._loop || this._sprite[sprite!][2]);
    };

    if (seek >= stop) {
      this._ended(sound);
      return sound._id;
    }

    const node = sound._node;

    if (this._webAudio) {
      const playWebAudio = () => {
        this._playLock = false;
        setParams();
        this._refreshBuffer(sound);

        const vol = sound._muted || this._muted ? 0 : sound._volume;
        node.gain.setValueAtTime(vol, Howler.ctx!.currentTime);
        sound._playStart = Howler.ctx!.currentTime;

        if (typeof (node.bufferSource as any).start === 'undefined') {
          (node.bufferSource as any).noteGrainOn(0, seek, sound._loop ? 86400 : duration);
        } else {
          (node.bufferSource as any).start(0, seek, sound._loop ? 86400 : duration);
        }

        if (timeout !== Infinity) {
          this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
        }

        if (!internal) {
          setTimeout(() => {
            this._emit('play', sound._id);
            this._loadQueue();
          }, 0);
        }
      };

      if (Howler.state === 'running' && Howler.ctx!.state !== 'interrupted') {
        playWebAudio();
      } else {
        this._playLock = true;
        this.once('resume', playWebAudio);
        this._clearTimer(sound._id);
      }
    } else {
      const playHtml5 = () => {
        node.currentTime = seek;
        node.muted = sound._muted || this._muted || Howler._muted || node.muted;
        const volume = Howler.volume();
        node.volume = sound._volume * (typeof volume === 'number' ? volume : 1);
        node.playbackRate = sound._rate;

        try {
          const play = node.play();

          if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof (play as any).then === 'function')) {
            this._playLock = true;

            setParams();

            (play as any)
              .then(() => {
                this._playLock = false;
                (node as any)._unlocked = true;
                if (!internal) {
                  this._emit('play', sound._id);
                } else {
                  this._loadQueue();
                }
              })
              .catch(() => {
                this._playLock = false;
                this._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.');
                sound._ended = true;
                sound._paused = true;
              });
          } else if (!internal) {
            this._playLock = false;
            setParams();
            this._emit('play', sound._id);
          }

          node.playbackRate = sound._rate;

          if (node.paused) {
            this._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.');
            return;
          }

          if (sprite !== '__default' || sound._loop) {
            this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
          } else {
            this._endTimers[sound._id] = () => {
              this._ended(sound);
              node.removeEventListener('ended', this._endTimers[sound._id], false);
            };
            node.addEventListener('ended', this._endTimers[sound._id], false);
          }
        } catch (err: unknown) {
          this._emit('playerror', sound._id, err instanceof Error ? err.message : String(err));
        }
      };

      if (node.src === 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA') {
        node.src = this._src;
        node.load();
      }

      const loadedNoReadyState = (typeof (window as any).ejecta !== 'undefined') || (!node.readyState && Howler._navigator && (Howler._navigator as any).isCocoonJS);
      if (node.readyState >= 3 || loadedNoReadyState) {
        playHtml5();
      } else {
        this._playLock = true;
        this._state = 'loading';

        const listener = () => {
          this._state = 'loaded';
          playHtml5();
          node.removeEventListener(Howler._canPlayEvent, listener, false);
        };
        node.addEventListener(Howler._canPlayEvent, listener as any, false);

        this._clearTimer(sound._id);
      }
    }

    return sound._id;
  }

  pause(id?: number): Howl {
    

    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'pause',
        action: () => {
          this.pause(id);
        }
      });

      return this;
    }

    const ids = this._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      this._clearTimer(ids[i]);

      const sound = this._soundById(ids[i]);

      if (sound && !sound._paused) {
        sound._seek = this.seek(ids[i]) as number;
        sound._rateSeek = 0;
        sound._paused = true;

        this._stopFade(ids[i]);

        if (sound._node) {
          if (this._webAudio) {
            if (!sound._node.bufferSource) {
              continue;
            }

            if (typeof (sound._node.bufferSource as any).stop === 'undefined') {
              (sound._node.bufferSource as any).noteOff(0);
            } else {
              (sound._node.bufferSource as any).stop(0);
            }

            this._cleanBuffer(sound._node);
          } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
            sound._node.pause();
          }
        }
      }

      if (!arguments[1]) {
        this._emit('pause', sound ? sound._id : null);
      }
    }

    return this;
  }

  stop(id?: number, internal?: boolean): Howl {
    

    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'stop',
        action: () => {
          this.stop(id);
        }
      });

      return this;
    }

    const ids = this._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      this._clearTimer(ids[i]);

      const sound = this._soundById(ids[i]);

      if (sound) {
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._paused = true;
        sound._ended = true;

        this._stopFade(ids[i]);

        if (sound._node) {
          if (this._webAudio) {
            if (sound._node.bufferSource) {
              if (typeof (sound._node.bufferSource as any).stop === 'undefined') {
                (sound._node.bufferSource as any).noteOff(0);
              } else {
                (sound._node.bufferSource as any).stop(0);
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
          this._emit('stop', sound._id);
        }
      }
    }

    return this;
  }

  mute(muted: boolean, id?: number): boolean | Howl {
    

    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'mute',
        action: () => {
          this.mute(muted, id);
        }
      });

      return this;
    }

    if (typeof id === 'undefined') {
      if (typeof muted === 'boolean') {
        this._muted = muted;
      } else {
        return this._muted;
      }
    }

    const ids = this._getSoundIds(id);

    for (let i = 0; i < ids.length; i++) {
      const sound = this._soundById(ids[i]);

      if (sound) {
        sound._muted = muted;

        if (sound._interval) {
          this._stopFade(sound._id);
        }

        if (this._webAudio && sound._node) {
          sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx!.currentTime);
        } else if (sound._node) {
          sound._node.muted = Howler._muted ? true : muted;
        }

        this._emit('mute', sound._id);
      }
    }

    return this;
  }

  volume(): number;
  volume(vol: number): Howl;
  volume(vol?: number): number | Howl {
    
    const args = arguments;
    let volume: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      return this._volume;
    } else if (args.length === 1 || (args.length === 2 && typeof args[1] === 'undefined')) {
      const ids = this._getSoundIds();
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
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'volume',
          action: () => {
            this.volume.apply(this, args as any);
          }
        });

        return this;
      }

      if (typeof id === 'undefined') {
        this._volume = volume;
      }

      id = this._getSoundIds(id);
      for (let i = 0; i < (id as any).length; i++) {
        sound = this._soundById((id as any)[i]);

        if (sound) {
          sound._volume = volume;

          if (!(args as any)[2]) {
            this._stopFade((id as any)[i]);
          }

          if (this._webAudio && sound._node && !sound._muted) {
            sound._node.gain.setValueAtTime(volume, Howler.ctx!.currentTime);
          } else if (sound._node && !sound._muted) {
            const volumeMultiplierOrGlobal = Howler.volume();
            if (typeof volumeMultiplierOrGlobal === 'number') {
              sound._node.volume = volume * volumeMultiplierOrGlobal;
            }
          }

          this._emit('volume', sound._id);
        }
      }
    } else {
      sound = id ? this._soundById(id) : this._sounds[0];
      return sound ? sound._volume : 0;
    }

    return this;
  }

  fade(from: number, to: number, len: number, id?: number): Howl {
    

    if (this._state !== 'loaded' || this._playLock) {
      this._queue.push({
        event: 'fade',
        action: () => {
          this.fade(from, to, len, id);
        }
      });

      return this;
    }

    from = Math.min(Math.max(0, parseFloat(from as any)), 1);
    to = Math.min(Math.max(0, parseFloat(to as any)), 1);
    len = parseFloat(len as any);

    this.volume(from, id);

    const ids = this._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      const sound = this._soundById(ids[i]);

      if (sound) {
        if (!id) {
          this._stopFade(ids[i]);
        }

        if (this._webAudio && !sound._muted) {
          const currentTime = Howler.ctx!.currentTime;
          const end = currentTime + len / 1000;
          sound._volume = from;
          sound._node.gain.setValueAtTime(from, currentTime);
          sound._node.gain.linearRampToValueAtTime(to, end);
        }

        this._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
      }
    }

    return this;
  }

  _startFadeInterval(sound: Sound, from: number, to: number, len: number, id: number, isGroup: boolean): void {
    
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

      if (this._webAudio) {
        sound._volume = vol;
      } else {
        this.volume(vol, sound._id, true);
      }

      if (isGroup) {
        this._volume = vol;
      }

      if ((to < from && vol <= to) || (to > from && vol >= to)) {
        clearInterval(sound._interval as any);
        sound._interval = undefined;
        sound._fadeTo = undefined;
        this.volume(to, sound._id);
        this._emit('fade', sound._id);
      }
    }, stepLen);
  }

  _stopFade(id: number): Howl {
    
    const sound = this._soundById(id);

    if (sound && sound._interval) {
      if (this._webAudio) {
        sound._node.gain.cancelScheduledValues(Howler.ctx!.currentTime);
      }

      clearInterval(sound._interval as any);
      sound._interval = undefined;
      this.volume(sound._fadeTo as number, id);
      sound._fadeTo = undefined;
      this._emit('fade', id);
    }

    return this;
  }

  loop(): boolean;
  loop(loop: boolean): Howl;
  loop(loop?: boolean): boolean | Howl {
    
    const args = arguments;
    let loopVal: boolean | undefined;
    let id: number | undefined;
    let sound: Sound | null = null;

    if (args.length === 0) {
      return this._loop;
    } else if (args.length === 1) {
      if (typeof args[0] === 'boolean') {
        loopVal = args[0] as boolean;
        this._loop = loopVal;
      } else {
        sound = this._soundById(parseInt(args[0] as any, 10));
        return sound ? sound._loop : false;
      }
    } else if (args.length === 2) {
      loopVal = args[0] as boolean;
      id = parseInt(args[1] as any, 10);
    }

    const ids = this._getSoundIds(id);
    for (let i = 0; i < ids.length; i++) {
      sound = this._soundById(ids[i]);

      if (sound) {
        sound._loop = loopVal as boolean;
        if (this._webAudio && sound._node && (sound._node.bufferSource as any)) {
          (sound._node.bufferSource as any).loop = loopVal;
          if (loopVal) {
            (sound._node.bufferSource as any).loopStart = sound._start || 0;
            (sound._node.bufferSource as any).loopEnd = sound._stop;

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

  rate(): number;
  rate(rate: number): Howl;
  rate(rate?: number): number | Howl {
    
    const args = arguments;
    let rateVal: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      id = this._sounds[0]._id;
    } else if (args.length === 1) {
      const ids = this._getSoundIds();
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
      if (this._state !== 'loaded' || this._playLock) {
        this._queue.push({
          event: 'rate',
          action: () => {
            this.rate.apply(this, args as any);
          }
        });

        return this;
      }

      if (typeof id === 'undefined') {
        this._rate = rateVal;
      }

      id = this._getSoundIds(id);
      for (let i = 0; i < (id as any).length; i++) {
        sound = this._soundById((id as any)[i]);

        if (sound) {
          if (this.playing((id as any)[i])) {
            sound._rateSeek = this.seek((id as any)[i]) as number;
            sound._playStart = this._webAudio ? Howler.ctx!.currentTime : sound._playStart;
          }
          sound._rate = rateVal;

          if (this._webAudio && sound._node && (sound._node.bufferSource as any)) {
            (sound._node.bufferSource as any).playbackRate.setValueAtTime(rateVal, Howler.ctx!.currentTime);
          } else if (sound._node) {
            sound._node.playbackRate = rateVal;
          }

          const seek = this.seek((id as any)[i]) as number;
          const duration = (this._sprite[sound._sprite][0] + this._sprite[sound._sprite][1]) / 1000 - seek;
          const timeout = (duration * 1000) / Math.abs(sound._rate);

          if (this._endTimers[(id as any)[i]] || !sound._paused) {
            this._clearTimer((id as any)[i]);
            this._endTimers[(id as any)[i]] = setTimeout(this._ended.bind(this, sound), timeout);
          }

          this._emit('rate', sound._id);
        }
      }
    } else {
      sound = this._soundById(id);
      return sound ? sound._rate : this._rate;
    }

    return this;
  }

  seek(): number;
  seek(seek: number): Howl;
  seek(seek?: number): number | Howl {
    
    const args = arguments;
    let seekVal: number | undefined;
    let id: number | undefined;

    if (args.length === 0) {
      if (this._sounds.length) {
        id = this._sounds[0]._id;
      }
    } else if (args.length === 1) {
      const ids = this._getSoundIds();
      const index = ids.indexOf(args[0] as any);
      if (index >= 0) {
        id = parseInt(args[0] as any, 10);
      } else if (this._sounds.length) {
        id = this._sounds[0]._id;
        seekVal = parseFloat(args[0] as any);
      }
    } else if (args.length === 2) {
      seekVal = parseFloat(args[0] as any);
      id = parseInt(args[1] as any, 10);
    }

    if (typeof id === 'undefined') {
      return 0;
    }

    if (typeof seekVal === 'number' && (this._state !== 'loaded' || this._playLock)) {
      this._queue.push({
        event: 'seek',
        action: () => {
          this.seek.apply(this, args as any);
        }
      });

      return this;
    }

    const sound = this._soundById(id);

    if (sound) {
      if (typeof seekVal === 'number' && seekVal >= 0) {
        const playing = this.playing(id);
        if (playing) {
          this.pause(id, true);
        }

        sound._seek = seekVal;
        sound._ended = false;
        this._clearTimer(id);

        if (!this._webAudio && sound._node && !isNaN(sound._node.duration)) {
          sound._node.currentTime = seekVal;
        }

        const seekAndEmit = () => {
          if (playing) {
            this.play(id, true);
          }

          this._emit('seek', id);
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
        if (this._webAudio) {
          const realTime = this.playing(id) ? Howler.ctx!.currentTime - sound._playStart : 0;
          const rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
          return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
        } else {
          return sound._node.currentTime;
        }
      }
    }

    return this;
  }

  playing(id?: number): boolean {
    

    if (typeof id === 'number') {
      const sound = this._soundById(id);
      return sound ? !sound._paused : false;
    }

    for (let i = 0; i < this._sounds.length; i++) {
      if (!this._sounds[i]._paused) {
        return true;
      }
    }

    return false;
  }

  duration(id?: number): number {
    
    let duration = this._duration;

    const sound = this._soundById(id);
    if (sound) {
      duration = this._sprite[sound._sprite][1] / 1000;
    }

    return duration;
  }

  state(): string {
    return this._state;
  }

  unload(): null {
    

    // Execute plugin hooks before destruction
    globalPluginManager.executeHowlDestroy(this);

    const sounds = this._sounds;
    for (let i = 0; i < sounds.length; i++) {
      if (!sounds[i]._paused) {
        this.stop(sounds[i]._id);
      }

      if (!this._webAudio) {
        this._clearSound(sounds[i]._node);

        sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
        sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);
        sounds[i]._node.removeEventListener('ended', sounds[i]._endFn, false);

        Howler._releaseHtml5Audio(sounds[i]._node);
      }

      delete sounds[i]._node;

      this._clearTimer(sounds[i]._id);
    }

    const index = Howler._howls.indexOf(this);
    if (index >= 0) {
      Howler._howls.splice(index, 1);
    }

    let remCache = true;
    for (let i = 0; i < Howler._howls.length; i++) {
      if (Howler._howls[i]._src === this._src || (this._src as string).indexOf(Howler._howls[i]._src as string) >= 0) {
        remCache = false;
        break;
      }
    }

    if (cache && remCache) {
      delete cache[this._src as string];
    }

    Howler.noAudio = false;

    this._state = 'unloaded';
    this._sounds = [];

    return null;
  }

  on(event: string, fn: (...args: any[]) => void, id?: number, once?: boolean): Howl {
    
    const events = (this as any)['_on' + event];

    if (typeof fn === 'function') {
      events.push(once ? { id, fn, once } : { id, fn });
    }

    return this;
  }

  off(event: string, fn?: (...args: any[]) => void, id?: number): Howl {
    
    const events = (this as any)['_on' + event];
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
      (this as any)['_on' + event] = [];
    } else {
      const keys = Object.keys(this);
      for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('_on') === 0 && Array.isArray((this as any)[keys[i]])) {
          (this as any)[keys[i]] = [];
        }
      }
    }

    return this;
  }

  once(event: string, fn: (...args: any[]) => void, id?: number): Howl {
    

    this.on(event, fn, id, true);

    return this;
  }

  _emit(event: string, id?: number | null, msg?: string): Howl {
    const events = (this as any)['_on' + event];

    for (let i = events.length - 1; i >= 0; i--) {
      if (!events[i].id || events[i].id === id || event === 'load') {
        const fn = events[i].fn;
        setTimeout(() => {
          fn(id, msg);
        }, 0);

        if (events[i].once) {
          this.off(event, events[i].fn, events[i].id);
        }
      }
    }

    this._loadQueue(event);

    return this;
  }

  _loadQueue(event?: string): Howl {
    

    if (this._queue.length > 0) {
      const task = this._queue[0];

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

  _ended(sound: Sound): Howl {
    
    const sprite = sound._sprite;

    if (!this._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop!) {
      setTimeout(this._ended.bind(this, sound), 100);
      return this;
    }

    const loop = !!(sound._loop || this._sprite[sprite][2]);

    this._emit('end', sound._id);

    if (!this._webAudio && loop) {
      this.stop(sound._id, true).play(sound._id);
    }

    if (this._webAudio && loop) {
      this._emit('play', sound._id);
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      sound._playStart = Howler.ctx!.currentTime;

      const timeout = ((sound._stop! - (sound._start || 0)) * 1000) / Math.abs(sound._rate);
      this._endTimers[sound._id] = setTimeout(this._ended.bind(this, sound), timeout);
    }

    if (this._webAudio && !loop) {
      sound._paused = true;
      sound._ended = true;
      sound._seek = sound._start || 0;
      sound._rateSeek = 0;
      this._clearTimer(sound._id);

      this._cleanBuffer(sound._node);

      Howler._autoSuspend();
    }

    if (!this._webAudio && !loop) {
      this.stop(sound._id, true);
    }

    return this;
  }

  _clearTimer(id: number): Howl {
    

    if (this._endTimers[id]) {
      if (typeof this._endTimers[id] !== 'function') {
        clearTimeout(this._endTimers[id]);
      } else {
        const sound = this._soundById(id);
        if (sound && sound._node) {
          sound._node.removeEventListener('ended', this._endTimers[id], false);
        }
      }

      delete this._endTimers[id];
    }

    return this;
  }

  _soundById(id: number): Sound | null {
    

    for (let i = 0; i < this._sounds.length; i++) {
      if (id === this._sounds[i]._id) {
        return this._sounds[i];
      }
    }

    return null;
  }

  _inactiveSound(): Sound {
    

    this._drain();

    for (let i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        return this._sounds[i].reset();
      }
    }

    return new Sound(this);
  }

  _drain(): void {
    
    const limit = this._pool;
    let cnt = 0;

    if (this._sounds.length < limit) {
      return;
    }

    for (let i = 0; i < this._sounds.length; i++) {
      if (this._sounds[i]._ended) {
        cnt++;
      }
    }

    for (let i = this._sounds.length - 1; i >= 0; i--) {
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

  _getSoundIds(id?: number): number[] {
    

    if (typeof id === 'undefined') {
      const ids: number[] = [];
      for (let i = 0; i < this._sounds.length; i++) {
        ids.push(this._sounds[i]._id);
      }

      return ids;
    } else {
      return [id];
    }
  }

  _refreshBuffer(sound: Sound): Howl {
    

    sound._node.bufferSource = Howler.ctx!.createBufferSource();
    sound._node.bufferSource.buffer = cache[this._src as string];

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

    return this;
  }

  _cleanBuffer(node: any): Howl {
    
    const isIOS = isAppleVendor(Howler._navigator);

    if (!node.bufferSource) {
      return this;
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

    return this;
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
