/*!
 *  Howler.js Audio Sprite Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howl } from "howler";

// Cache references to DOM elements.
const elms = [
	"waveform",
	"sprite0",
	"sprite1",
	"sprite2",
	"sprite3",
	"sprite4",
	"sprite5",
];
elms.forEach((elm) => {
	window[elm] = document.getElementById(elm);
});

/**
 * Sprite class containing the state of our sprites to play and their progress.
 * @param {Object} options Settings to pass into and setup the sound and visuals.
 */
var Sprite = function (options) {
	this.sounds = [];

	// Setup the options to define this sprite display.
	this._width = options.width;
	this._left = options.left;
	this._spriteMap = options.spriteMap;
	this._sprite = options.sprite;
	this.setupListeners();

	// Create our audio sprite definition.
	this.sound = new Howl({
		src: options.src,
		sprite: options.sprite,
	});

	// Setup a resize event and fire it to setup our sprite overlays.
	window.addEventListener(
		"resize",
		() => {
			this.resize();
		},
		false,
	);
	this.resize();

	// Begin the progress step tick.
	requestAnimationFrame(this.step.bind(this));
};
Sprite.prototype = {
	/**
	 * Setup the listeners for each sprite click area.
	 */
	setupListeners: function () {
		var keys = Object.keys(this._spriteMap);

		keys.forEach((key) => {
			window[key].addEventListener(
				"click",
				() => {
					this.play(key);
				},
				false,
			);
		});
	},

	/**
	 * Play a sprite when clicked and track the progress.
	 * @param  {String} key Key in the sprite map object.
	 */
	play: function (key) {
		var sprite = this._spriteMap[key];

		// Play the sprite sound and capture the ID.
		var id = this.sound.play(sprite);

		// Create a progress element and begin visually tracking it.
		var elm = document.createElement("div");
		elm.className = "progress";
		elm.id = id;
		elm.dataset.sprite = sprite;
		window[key].appendChild(elm);
		this.sounds.push(elm);

		// When this sound is finished, remove the progress element.
		this.sound.once(
			"end",
			() => {
				var index = this.sounds.indexOf(elm);
				if (index >= 0) {
					this.sounds.splice(index, 1);
					window[key].removeChild(elm);
				}
			},
			id,
		);
	},

	/**
	 * Called on window resize to correctly position and size the click overlays.
	 */
	resize: function () {
		// Calculate the scale of our window from "full" size.
		var scale = window.innerWidth / 3600;

		// Resize and reposition the sprite overlays.
		var keys = Object.keys(this._spriteMap);
		for (var i = 0; i < keys.length; i++) {
			var sprite = window[keys[i]];
			sprite.style.width = Math.round(this._width[i] * scale) + "px";
			if (this._left[i]) {
				sprite.style.left = Math.round(this._left[i] * scale) + "px";
			}
		}
	},

	/**
	 * The step called within requestAnimationFrame to update the playback positions.
	 */
	step: function () {
		// Loop through all active sounds and update their progress bar.
		for (var i = 0; i < this.sounds.length; i++) {
			var id = parseInt(this.sounds[i].id, 10);
			var offset = this._sprite[this.sounds[i].dataset.sprite][0];
			var seek = (this.sound.seek(id) || 0) - offset / 1000;
			this.sounds[i].style.width =
				((seek / this.sound.duration(id)) * 100 || 0) + "%";
		}

		requestAnimationFrame(this.step.bind(this));
	},
};

// Setup our new sprite class and pass in the options.
var sprite = new Sprite({
	width: [78, 60, 62, 70, 62, 1895],
	left: [0, 342, 680, 1022, 1361],
	src: ["../../tests/audio/sound2.webm", "../../tests/audio/sound2.mp3"],
	sprite: {
		one: [0, 450],
		two: [2000, 250],
		three: [4000, 350],
		four: [6000, 380],
		five: [8000, 340],
		beat: [10000, 11163],
	},
	spriteMap: {
		sprite0: "one",
		sprite1: "two",
		sprite2: "three",
		sprite3: "four",
		sprite4: "five",
		sprite5: "beat",
	},
});
