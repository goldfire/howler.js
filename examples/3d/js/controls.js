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
 * Defines and handles the various controls.
 */
export var Controls = function() {
  // Define our control key codes and states.
  this.codes = {
    // Arrows
    37: 'left', 39: 'right', 38: 'front', 40: 'back',
    // WASD
    65: 'left', 68: 'right', 87: 'front', 83: 'back',
  };
  this.states = {left: false, right: false, front: false, back: false};

  // Setup the DOM listeners.
  document.addEventListener('keydown', this.key.bind(this, true), false);
  document.addEventListener('keyup', this.key.bind(this, false), false);
  document.addEventListener('touchstart', this.touch.bind(this), false);
  document.addEventListener('touchmove', this.touch.bind(this), false);
  document.addEventListener('touchend', this.touchEnd.bind(this), false);
};
Controls.prototype = {
  /**
   * Handle all keydown and keyup events and update our internal controls state.
   * @param  {Boolean} pressed Whether or not the key is being pressed.
   * @param  {Object} event   DOM event data including the key being pressed.
   */
  key: function(pressed, event) {
    var state = this.codes[event.keyCode];

    if (!state) {
      return;
    }

    this.states[state] = pressed;
    event.preventDefault && event.preventDefault();
    event.stopPropagation && event.stopPropagation();
  },

  /**
   * Listen for touch events and determine which key to simulate.
   * @param  {Object} event DOM event data including the position touched.
   */
  touch: function(event) {
    var touches = event.touches[0];

    // Reset the states.
    this.touchEnd(event);

    // Determine which key to simulate.
    if (touches.pageY < window.innerHeight * 0.3) {
      this.key(true, {keyCode: 38});
    } else if (touches.pageY > window.innerHeight * 0.7) {
      this.key(true, {keyCode: 40});
    } else if (touches.pageX < window.innerWidth * 0.5) {
      this.key(true, {keyCode: 37});
    } else if (touches.pageX > window.innerWidth * 0.5) {
      this.key(true, {keyCode: 39});
    }
  },

  /**
   * Fired to reset all key statuses based on no fingers being on the screen.
   * @param  {Object} event DOM event data including the position touched.
   */
  touchEnd: function(event) {
    this.states.left = false;
    this.states.right = false;
    this.states.front = false;
    this.states.back = false;

    event.preventDefault();
    event.stopPropagation();
  }
};
