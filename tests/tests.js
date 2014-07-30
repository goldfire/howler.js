// Cache the label for later use.
var label = document.getElementById('label');

// Setup the sounds to be used.
var sound1 = new Howl({
  src: ['sound1.ogg', 'sound1.mp3']
});

var sound2 = new Howl({
  src: ['sound1.ogg', 'sound1.mp3'],
  html5: true
});

// Define the tests to run.
var id, id2;
var tests = [
  function(fn) {
    id = sound1.play();

    label.innerHTML = 'PLAYING';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.pause(id);

    label.innerHTML = 'PAUSED';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound1.play(id);

    label.innerHTML = 'RESUMING';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.stop(id);

    label.innerHTML = 'STOPPED';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound1.play(id);

    label.innerHTML = 'PLAY FROM START';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT';
    sound1.once('faded', function() {
      fn();
    });
  },

  function(fn) {
    sound1.fade(0, 1, 2000, id);

    label.innerHTML = 'FADE IN';
    sound1.once('faded', function() {
      fn();
    });
  },

  function(fn) {
    sound1.mute(true, id);

    label.innerHTML = 'MUTE';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound1.mute(false, id);

    label.innerHTML = 'UNMUTE';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.volume(0.5, id);

    label.innerHTML = 'HALF VOLUME';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.volume(1, id);

    label.innerHTML = 'FULL VOLUME';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.seek(0, id);

    label.innerHTML = 'SEEK TO START';
    setTimeout(fn, 2000);
  },

  function(fn) {
    id2 = sound1.play();

    label.innerHTML = 'PLAY 2ND';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.mute(true);

    label.innerHTML = 'MUTE GROUP';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound1.mute(false);

    label.innerHTML = 'UNMUTE GROUP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.volume(0.5);

    label.innerHTML = 'HALF VOLUME GROUP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.fade(0.5, 0, 2000);

    label.innerHTML = 'FADE OUT GROUP';
    sound1.once('faded', function() {
      fn();
    });
  },

  function(fn) {
    sound1.fade(0, 1, 2000);

    label.innerHTML = 'FADE IN GROUP';
    sound1.once('faded', function() {
      fn();
    });
  },

  function(fn) {
    sound1.stop();

    label.innerHTML = 'STOP GROUP';
    setTimeout(fn, 1500);
  }
];

// Create a method that will call the next in the series.
var chain = function(i) {
  return function() {
    if (tests[i]) {
      tests[i](chain(++i));
    } else {
      // DONE!
    }
  };
};

// Listen to a click on the button to being the tests.
var start = document.getElementById('start');
start.addEventListener('click', function() {
  tests[0](chain(1));
  start.style.display = 'none';
}, false);