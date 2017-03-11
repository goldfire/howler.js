/*!
 *  Howler.js 3D Sound Demo
 *  howlerjs.com
 *
 *  (c) 2013-2017, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

'use strict';

// Cache some commonly used values.
var circle = Math.PI * 2;
var isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk/i.test(navigator.userAgent);
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

/**
 * Main game class that runs the tick and sets up all other components.
 */
var Game = function() {
  this.lastTime = 0;

  // Setup our different game components.
  this.audio = new Sound();
  this.player = new Player(10, 26, Math.PI * 1.9, 2.5);
  this.controls = new Controls();
  this.map = new Map(25);
  this.camera = new Camera(isMobile ? 256 : 512);
  
  requestAnimationFrame(this.tick.bind(this));
};
Game.prototype = {
  /**
   * Main game loop that renders the full scene on each screen refresh.
   * @param  {Number} time
   */
  tick: function(time) {
    var ms = time - this.lastTime;
    this.lastTime = time;

    // Update the different components of the scene.
    this.map.update(ms / 1000);
    this.player.update(ms / 1000);
    this.camera.render(this.player, this.map);

    // Continue the game loop.
    requestAnimationFrame(this.tick.bind(this));
  }
};

// Setup and start the new game instance.
var game = new Game();

// Generate the new map.
game.map.setup();