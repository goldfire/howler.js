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
 * The player from which we cast the rays.
 * @param {Number} x     Starting x-position.
 * @param {Number} y     Starting y-position.
 * @param {Number} dir   Direction they are facing in radians.
 * @param {Number} speed Speed they walk at.
 */
var Player = function(x, y, dir, speed) {
  this.x = x;
  this.y = y;
  this.dir = dir;
  this.speed = speed || 3;
  this.steps = 0;
  this.hand = new Texture('./assets/gun.png', 512, 360);

  // Update the position of the audio listener.
  Howler.pos(this.x, this.y, -0.5);

  // Update the direction and orientation.
  this.rotate(dir);
};
Player.prototype = {
  /**
   * Rotate the player's viewing direction.
   * @param  {Number} angle Angle to rotate by.
   */
  rotate: function(angle) {
    this.dir = (this.dir + angle + circle) % circle;

    // Calculate the rotation vector and update the orientation of the listener.
    var x = Math.cos(this.dir);
    var y = 0;
    var z = Math.sin(this.dir);
    Howler.orientation(x, y, z, 0, 1, 0);
  },

  /**
   * Handle walking based on the state of inputs.
   * @param  {Number} dist Distance to walk based on time elapsed.
   */
  walk: function(dist) {
    var dx = Math.cos(this.dir) * dist;
    var dy = Math.sin(this.dir) * dist;

    // Move the player if they can walk here.
    this.x += (game.map.check(this.x + dx, this.y) <= 0) ? dx : 0;
    this.y += (game.map.check(this.x, this.y + dy) <= 0) ? dy : 0;

    this.steps += dist;

    // Update the position of the audio listener.
    Howler.pos(this.x, this.y, -0.5);
  },

  /**
   * Update the player position and rotation on each tick.
   * @param  {Number} secs Seconds since last update.
   */
  update: function(secs) {
    var states = game.controls.states;

    if (states.left) this.rotate(-Math.PI * secs);
    if (states.right) this.rotate(Math.PI * secs);
    if (states.front) this.walk(this.speed * secs);
    if (states.back) this.walk(-this.speed * secs);
  }
};
