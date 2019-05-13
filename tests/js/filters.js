

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
  start.innerHTML = 'BEGIN FILTER TESTS';
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
    
    sound.addFilter({
        filterType: "lowpass",
        frequency: 250.0,
        Q: 3.0
    })
    label.innerHTML = 'LOWPASS';
    setTimeout(fn, 3000);
  },

  function(fn) {
    sound.filterType('highpass');
    sound.frequency(10000);
    setTimeout(fn, 3000);
    label.innerHTML = 'HIPASS';
  },
  function(fn) {
    sound.filterType('bandpass');
    sound.frequency(1000);
    sound.qFactor(7.0);
    setTimeout(fn, 3000);
    label.innerHTML = 'BANDPASS';
  },
  function(fn) {
    sound.filterType('notch');
    sound.frequency(5000);
    sound.qFactor(0.2);
    setTimeout(fn, 3000);
    label.innerHTML = 'NOTCH';
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