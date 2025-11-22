/*!
 *  Howler.js 3D Sound Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howler } from "./howlerConfig.js";
import { Camera } from "./camera.js";
import { Controls } from "./controls.js";
import { Map } from "./map.js";
import { Player } from "./player.js";
import { Sound } from "./sound.js";
import { isMobile } from "./utils.js";


/**
 * Main game class that runs the tick and sets up all other components.
 */
class Game {
	constructor() {
		this.lastTime = 0;
		this.Howler = Howler;

		// Setup our different game components.
		this.audio = new Sound();
		this.player = new Player(10, 26, Math.PI * 1.9, 2.5);
		this.controls = new Controls();
		this.map = new Map(25);
		this.camera = new Camera(isMobile ? 256 : 512);

		this.tick = this.tick.bind(this);

		requestAnimationFrame(this.tick);
	}
	/**
	 * Main game loop that renders the full scene on each screen refresh.
	 * @param  {Number} time
	 */
	tick(time) {
		var ms = time - this.lastTime;
		this.lastTime = time;

		// Update the different components of the scene.
		this.map.update(ms / 1000);
		this.player.update(ms / 1000);
		this.camera.render(this.player, this.map);

		// Continue the game loop.
		requestAnimationFrame(this.tick);
	}
}
// Generate the new map.
const game = new Game();
// Setup and start the new game instance.
game.map.setup();
export { game };
