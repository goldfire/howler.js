// Cache the label for later use.
var label = document.getElementById('label');
var start = document.getElementById('start');

// Setup the sounds to be used.
var sound = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3']
});

// Enable the start button when the sounds have loaded.
sound.once('load', function() {
  start.removeAttribute('disabled');
  start.innerHTML = 'BEGIN DELAY TESTS';
});

// Define the tests to run.
var id;
var tests = [
  function(fn) {
    sound.once('play', function() {
      sound.volume(1.0);
      label.innerHTML = 'PLAYING';
      setTimeout(fn, 2000);
    });
    
    id = sound.play();
  },

  function(fn) {
    
    sound.delayVolume(1.0);
    label.innerHTML = 'DELAY LEVEL 1.0';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound.delayTime(0.25);
    label.innerHTML = 'DELAY TIME 25ms';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound.delayFeedback(0.8);
    label.innerHTML = 'DELAY FEEDBACK 80%';
    setTimeout(fn, 2000);
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