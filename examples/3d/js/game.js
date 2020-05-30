/*!
 *  Howler.js 3D Sound Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

"use strict";

// Cache some commonly used values.
var circle = Math.PI * 2;
var isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk/i.test(
  navigator.userAgent
);
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

/**
 * Main game class that runs the tick and sets up all other components.
 */
var Game = function () {
  this.lastTime = 0;

  // Setup our different game components.
  this.audio = new Sound();
  this.player = new Player(10, 26, Math.PI * 1.9, 1);
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
  tick: function (time) {
    var ms = time - this.lastTime;
    this.lastTime = time;

    // Update the different components of the scene.
    this.map.update(ms / 1000);
    this.player.update(ms / 1000);
    this.camera.render(this.player, this.map);

    requestAnimationFrame(this.tick.bind(this));
  },
};
var game;
document.querySelector("#start").onclick = function () {
  this.style.display = "none";
  // Setup and start the new game instance.
  game = new Game();

  // Generate the new map.

  Mouse.setup({
    onRotate: (rad) => {
      var ms = new Date().getTime() - game.lastTime;
      game.player.rotate((rad * ms) / 1000);
    },
    onMoveStart: () => {
      _console.log("move start");
      game.controls.states.front = true;
    },
    onMoveStop: () => (game.controls.states.front = false),
  });
};

const Mouse = (function () {
  var _x, _y;
  var animationFrame;
  var waitAnime = 0;
  const RADIUS = 2;
  const pointerImg = new Texture("./assets/gun.png", 44, 44);
  const canvas = document.getElementById("hud");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  _x = canvas.width / 2;
  _y = canvas.height / 2;
  const ctx = canvas.getContext("2d");

  function setup({ onRotate, onMoveStart, onMoveStop }) {
    canvas.requestPointerLock();

    canvas.onmousedown = function (e) {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        _x = e.offsetX;
        _y = e.offsetY;
        drawCursor();
      }
      if (e.buttons === 3) {
        onMoveStart && onMoveStart();
      }
      if (e.buttons >= 2) {
        e.preventDefault(); //right click;
      }
    };
    canvas.onmouseup = function (e) {
      e.buttons === 0 && onMoveStop && onMoveStop();
    };
    canvas.onmousemove = (e) => {
      if (e.buttons > 0 && onRotate && waitAnime === 0) {
        _console.log(
          e.movementX +
            " / " +
            canvas.width +
            " = " +
            Math.atan(e.movementX / canvas.width / 5)
        );
        onRotate(Math.atan(e.movementX / canvas.width / 5));
        waitAnime = 1;
        e.preventDefault();
      }
      _x += e.movementX;
      _y += e.movementY;
      if (_x > canvas.width) _x -= RADIUS;
      if (_x < 0) _x += RADIUS;
      if (_y > canvas.height) _y -= RADIUS;
      if (_y < 0) _y -= RADIUS;
      ctx.translate(e.movementX, e.movementY);
      drawCursor();
    };
    //  drawCursor();
  }

  function drawCursor() {
    if (!animationFrame && document.pointerLockElement == canvas) {
      animationFrame = requestAnimationFrame(function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(pointerImg.image, _x, _y, 55, 55);
        animationFrame = null;
        waitAnime = 0;
      });
    }
  }
  return {
    setup,
    drawCursor,
  };
})();
