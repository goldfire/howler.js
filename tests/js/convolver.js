// Cache the label for later use.
var label = document.getElementById('label');
var start = document.getElementById('start');

// Setup the sounds to be used.
var sound = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3']
});

Howler.addConvolver("Cathedral", "audio/ir.wav", function()
{
  // Enable the start button when the sounds have loaded.
  sound.once('load', function() {
    start.removeAttribute('disabled');
    start.innerHTML = 'BEGIN CONVOLVER TESTS';
  });
}); 

Howler.addConvolver("Slinky", "audio/slinky_ir.wav"); 



// Define the tests to run.
var id;
var tests = [
  function(fn) {
    sound.once('play', function() {
      label.innerHTML = 'PLAYING';
      setTimeout(fn, 2000);
    });
    
    id = sound.play();
  },

  function(fn) {
    sound.sendToConvolver("Cathedral", 3.0);
    label.innerHTML = 'SEND TO CATHEDRAL';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound.setConvolverSendLevel(0.0);
    label.innerHTML = 'WET 0%';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound.setConvolverSendLevel(3.0);
    label.innerHTML = 'WET 100%';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound.volume(0.0);
    label.innerHTML = 'DRY 0%';
    setTimeout(function() {
      fn();
    }, 2000);
  },

  function(fn) {
    sound.removeFromConvolver("Cathedral");
    label.innerHTML = 'REMOVE FROM CATHEDRAL';
    setTimeout(fn, 2000);
  },

  function(fn) {
    label.innerHTML = 'ADD TO SLINKY';
    sound.sendToConvolver("Slinky", 1.0);
    setTimeout(function() {
      fn();
    }, 2000);
  },

  function(fn) {
    sound.fade(0, 1, 10000);
    label.innerHTML = 'FADE IN DRY SIGNAL';
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