/*!
 *  Howler.js 3D Sound Demo
 *  howlerjs.com
 *
 *  (c) 2013-2018, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

'use strict';

/**
 * Setup and control all of the game's audio.
 */
var Sound = function() {
  // Setup the shared Howl.
  this.sound = new Howl({
    src: ['./assets/sprite.webm', './assets/sprite.mp3'],
    sprite: {
      lightning: [2000, 4147],
      rain: [8000, 9962, true],
      thunder: [19000, 13858],
      music: [34000, 31994, true]
    },
    volume: 0
  });

  // Begin playing background sounds.
  this.rain();
  this.thunder();
};
Sound.prototype = {
  /**
   * Play a rain loop in the background.
   */
  rain: function() {
    this._rain = this.sound.play('rain');
    this.sound.volume(0.2, this._rain);
  },

  /**
   * Randomly play thunder sounds periodically.
   */
  thunder: function() {
    setTimeout(function() {
      // Play the thunder sound in a random position.
      var x = Math.round(100 * (2 - (Math.random() * 4))) / 100;
      var y = Math.round(100 * (2 - (Math.random() * 4))) / 100;
      this._thunder = this.sound.play('thunder');
      this.sound.pos(x, y, -0.5, this._thunder);
      this.sound.volume(1, this._thunder);

      // Schedule the next clap.
      this.thunder();
    }.bind(this), 5000 + Math.round(Math.random() * 15000));
  },

  /**
   * Play lightning in a random location with a random rate/pitch.
   */
  lightning: function() {
    var x = Math.round(100 * (2.5 - (Math.random() * 5))) / 100;
    var y = Math.round(100 * (2.5 - (Math.random() * 5))) / 100;
    var rate = Math.round(100 * (0.4 + (Math.random() * 1.25))) / 100;

    // Play the lightning sound.
    var id = this.sound.play('lightning');

    // Change the position and rate.
    this.sound.pos(x, y, -0.5, id);
    this.sound.rate(rate, id);
    this.sound.volume(1, id);
  },

  /**
   * Setup a speaker in 3D space to play music from.
   * @param  {Number} x x-tile position of speaker.
   * @param  {Number} y y-tile position of speaker.
   */
  speaker: function(x, y) {
    var soundId = game.audio.sound.play('music');
    this.sound.once('play', function() {
      // Set the position of the speaker in 3D space.
      this.sound.pos(x + 0.5, y + 0.5, -0.5, soundId);
      this.sound.volume(1, soundId);

      // Tweak the attributes to get the desired effect.
      this.sound.pannerAttr({
        panningModel: 'HRTF',
        refDistance: 0.8,
        rolloffFactor: 2.5,
        distanceModel: 'exponential'
      }, soundId);
    }.bind(this), soundId);
  }
};
