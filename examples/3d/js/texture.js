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
 * Load a texture and store its details.
 * @param {String} src Image URL.
 * @param {Number} w   Image width.
 * @param {Number} h   Image height.
 */
var Texture = function(src, w, h) {
  this.image = new Image();
  this.image.src = src;
  this.width = w;
  this.height = h;
};