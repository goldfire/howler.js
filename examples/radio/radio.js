/*!
 *  Howler.js Radio Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

import { Howl, Howler } from "howler";

// Patch Howler's HTML5 audio element creation to set crossOrigin for CORS support
const originalObtainHtml5Audio = Howler._obtainHtml5Audio;
Howler._obtainHtml5Audio = function () {
	const audio = originalObtainHtml5Audio.call(this);
	// Set crossOrigin before src is set to enable CORS
	if (audio && audio.crossOrigin !== undefined) {
		audio.crossOrigin = "anonymous";
	}
	return audio;
};

// Cache references to DOM elements.
const elms = [
	"station0",
	"title0",
	"live0",
	"playing0",
	"station1",
	"title1",
	"live1",
	"playing1",
	"station2",
	"title2",
	"live2",
	"playing2",
	"station3",
	"title3",
	"live3",
	"playing3",
	"station4",
	"title4",
	"live4",
	"playing4",
];
elms.forEach((elm) => {
	window[elm] = document.getElementById(elm);
});

/**
 * Radio class containing the state of our stations.
 * Includes all methods for playing, stopping, etc.
 * @param {Array} stations Array of objects with station details ({title, src, howl, ...}).
 */
class Radio {
	constructor(stations) {
		this.stations = stations;
		this.index = 0;

		// Setup the display for each station.
		for (let i = 0; i < this.stations.length; i++) {
			window["title" + i].innerHTML =
				"<b>" + this.stations[i].freq + "</b> " + this.stations[i].title;
			window["station" + i].addEventListener("click", () => {
				const isNotPlaying =
					this.stations[i].howl && !this.stations[i].howl.playing();

				// Stop other sounds or the current one.
				radio.stop();

				// If the station isn't already playing or it doesn't exist, play it.
				if (isNotPlaying || !this.stations[i].howl) {
					radio.play(i);
				}
			});
		}
	}

	/**
	 * Play a station with a specific index.
	 * @param  {Number} index Index in the array of stations.
	 */
	play(index) {
		let sound;

		index = typeof index === "number" ? index : this.index;
		const data = this.stations[index];

		// If we already loaded this track, use the current one.
		// Otherwise, setup and load a new Howl.
		if (data.howl) {
			sound = data.howl;
		} else {
			sound = data.howl = new Howl({
				src: data.src,
				html5: true, // A live stream can only be played through HTML5 Audio.
				format: ["mp3", "aac"],
				onloaderror: (id, error) => {
					console.error("Error loading stream:", error);
					alert("Failed to load radio stream. Please try another station.");
				},
				onplayerror: (id, error) => {
					console.error("Error playing stream:", error);
					alert("Failed to play radio stream. Please try another station.");
				},
			});
		}

		// Begin playing the sound.
		sound.play();

		// Toggle the display.
		this.toggleStationDisplay(index, true);

		// Keep track of the index we are currently playing.
		this.index = index;
	}

	/**
	 * Stop a station's live stream.
	 */
	stop() {
		// Get the Howl we want to manipulate.
		const sound = this.stations[this.index].howl;

		// Toggle the display.
		this.toggleStationDisplay(this.index, false);

		// Stop the sound.
		if (sound) {
			sound.unload();
		}
	}

	/**
	 * Toggle the display of a station to off/on.
	 * @param  {Number} index Index of the station to toggle.
	 * @param  {Boolean} state true is on and false is off.
	 */
	toggleStationDisplay(index, state) {
		// Highlight/un-highlight the row.
		window["station" + index].style.backgroundColor = state
			? "rgba(255, 255, 255, 0.33)"
			: "";

		// Show/hide the "live" marker.
		window["live" + index].style.opacity = state ? 1 : 0;

		// Show/hide the "playing" animation.
		window["playing" + index].style.display = state ? "block" : "none";
	}
}

// Setup our new radio and pass in the stations.
// Using streams that are known to work with browser-based players
const radio = new Radio([
	{
		freq: "81.4",
		title: "Chill Out Zone",
		src: "https://streams.fluxfm.de/Chillout/mp3-320/streams.fluxfm.de/",
		howl: null,
	},
	{
		freq: "89.9",
		title: "Radio Paradise",
		src: "https://stream.radioparadise.com/mp3-128",
		howl: null,
	},
	{
		freq: "98.9",
		title: "Smooth Jazz",
		src: "https://streams.fluxfm.de/SmoothJazz/mp3-320/streams.fluxfm.de/",
		howl: null,
	},
	{
		freq: "103.3",
		title: "Classic Rock",
		src: "https://streams.fluxfm.de/ClassicRock/mp3-320/streams.fluxfm.de/",
		howl: null,
	},
	{
		freq: "107.7",
		title: "Radio Paradise (Alternative)",
		src: "https://stream.radioparadise.com/aac-128",
		howl: null,
	},
]);
