// Cache the label for later use.
var label = document.getElementById('label');
var start = document.getElementById('start');

// Setup the sounds to be used.
var sound1 = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3']
});

var sound2 = new Howl({
  src: ['audio/sound2.webm', 'audio/sound2.mp3'],
  sprite: {
    one: [0, 450],
    two: [2000, 250],
    three: [4000, 350],
    four: [6000, 380],
    five: [8000, 340],
    beat: [10000, 11163]
  }
});

// Enable the start button when the sounds have loaded.
sound1.once('load', function() {
  start.removeAttribute('disabled');
  start.innerHTML = 'BEGIN STEREO TESTS';
});

// Define the tests to run.
var id;
var tests = [
  function(fn) {
    sound1.once('play', function() {
      label.innerHTML = 'PLAYING';
      setTimeout(fn, 2000);
    });
    
    id = sound1.play();
  },

  function(fn) {
    sound1.stereo(-1, id);

    label.innerHTML = 'LEFT STEREO';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.stereo(1, id);

    label.innerHTML = 'RIGHT STEREO';
    setTimeout(function() {
      fn();
    }, 2000);
  }
];

// Create a method that will call the next in the series.
var chain = function(i) {
  return function() {
    if (tests[i]) {
      tests[i](chain(++i));
    } else {
      label.innerHTML = 'COMPLETE!';
      label.style.color = '#74b074';

      // Wait for 5 seconds and then go back to the tests index.
      setTimeout(function() {
        window.location = './';
      }, 5000);
    }
  };
};

// If Web Audio isn't available, send them to hTML5 test.
if (Howler.usingWebAudio) {
  // Listen to a click on the button to being the tests.
  start.addEventListener('click', function() {
    tests[0](chain(1));
    start.style.display = 'none';
  }, false);
} else {
  window.location = 'core.html5audio.html';
}