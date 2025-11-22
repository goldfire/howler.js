/*!
 *  Howler.js 3D Sound Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

'use strict';

/**
 * Generates the map and calculates the casting of arrays for the camera to display on screen.
 * @param {Number} size Grid size of the map to use.
 */
export var Map = function(size) {
  this.size = size;
  this.grid = new Array(size * size);
  this.skybox = new Texture('./assets/skybox.jpg', 4096, 1024);
  this.wall = new Texture('./assets/wall.jpg', 1024, 1024);
  this.speaker = new Texture('./assets/speaker.jpg', 1024, 1024);
  this.light = 0;

  // Define the pre-defined map template on a 25x25 grid.
  this.grid = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1];
};
Map.prototype = {
  /**
   * Sets up the map including the speaker audio points.
   */
  setup: function() {
    // Loop through the tiles and setup the audio listeners.
    for (var i=0; i<this.grid.length; i++) {
      if (this.grid[i] === 2) {
        var y = Math.floor(i / this.size);
        var x = i % this.size;
        game.audio.speaker(x, y);
      }
    }
  },

  /**
   * Check if a gird location is out of bounds, a wall or empty.
   * @param  {Number} x x-coordinate
   * @param  {Number} y y-coordinate
   * @return {Number}   -1, 0, 1
   */
  check: function(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) {
      return -1;
    }

    return this.grid[y * this.size + x];
  },

  /**
   * Emit a ray to beginb uilding the scene.
   * @param  {Number} sin    Sine of the cast angle.
   * @param  {Number} cos    Cosine of the cast angle.
   * @param  {Number} range  Max length of the ray.
   * @param  {Object} origin x, y, height and sitance
   */
  ray: function(sin, cos, range, origin) {
    var stepX = this.step(sin, cos, origin.x, origin.y, false);
    var stepY = this.step(cos, sin, origin.y, origin.x, true);
    
    var inspectX = [sin, cos, stepX, 1, 0, origin.dist, stepX.y];
    var inspectY = [sin, cos, stepY, 0, 1, origin.dist, stepY.x];
    var next = this.inspect.apply(this, (stepX.len2 < stepY.len2) ? inspectX : inspectY);

    if (next.dist > range) {
      return [origin];
    }

    return [origin].concat(this.ray(sin, cos, range, next));
  },

  /**
   * Processes each step along the ray.
   * @param  {Number} rise     Slope of line: sine of the cast angle.
   * @param  {Number} run      Slope of line: cosine of the cast angle.
   * @param  {Number} x        Origin x-position.
   * @param  {Number} y        Origin y-position.
   * @param  {Boolean} inverted
   */
  step: function(rise, run, x, y, inverted) {
    if (run === 0) {
      return {len2: Infinity};
    }

    var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
    var dy = dx * (rise / run);

    return {
      x: inverted ? y + dy : x + dx,
      y: inverted ? x + dx : y + dy,
      len2: dx * dx + dy * dy
    };
  },

  /**
   * Inspect the next position to determine distance, height, shading, etc.
   * @param  {Number} sin    Sine of the cast angle.
   * @param  {Number} cos    Cosine of the cast angle.
   * @param  {Object} step   x, y and length of the step.
   * @param  {Number} shiftX X shifted by 1 or 0.
   * @param  {Number} shiftY Y shifted by 1 or 0.
   * @param  {Number} dist   Distnace from origin.
   * @param  {Number} offset Step offset.
   */
  inspect: function(sin, cos, step, shiftX, shiftY, dist, offset) {
    var dx = (cos < 0) ? shiftX : 0;
    var dy = (sin < 0) ? shiftY : 0;

    step.type = this.check(step.x - dx, step.y - dy);
    step.height = (step.type) > 0 ? 1 : 0;
    step.dist = dist + Math.sqrt(step.len2);

    if (shiftX) {
      step.shading = (cos < 0) ? 2 : 0;
    } else {
      step.shading = (sin < 0) ? 2 : 1;
    }

    step.offset = offset - Math.floor(offset);

    return step;
  },

  /**
   * Casts a ray from the camera and returns the results.
   * @param  {Object} point Player/camera's x/y position.
   * @param  {Number} angle Angle (in radians) of camera.
   * @param  {Number} range Max length of the ray.
   */
  cast: function(point, angle, range) {
    var sin = Math.sin(angle);
    var cos = Math.cos(angle);

    return this.ray(sin, cos, range, {
      x: point.x,
      y: point.y,
      height: 0,
      dist: 0
    });
  },

  /**
   * Update loop on the map, in this case used to add in lightning by adjusting global lighting.
   * @param  {Number} secs Seconds since last tick.
   */
  update: function(secs) {
    if (this.light > 0) {
      this.light = Math.max(this.light - 10 * secs, 0);
    } else if (Math.random() * 6 < secs) {
      this.light = 2;

      // Play the lightning sound.
      game.audio.lightning();
    }
  }
};
