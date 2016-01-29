// Cache the label for later use.
var label = document.getElementById('label');
var logo = document.getElementById('logo');

// Setup the sounds to be used.
var sound1 = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3']
});

var sound2 = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3'],
  html5: true
});

var sound3 = new Howl({
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

var sound4 = new Howl({
  src: ['audio/sound2.webm', 'audio/sound2.mp3'],
  html5: true,
  sprite: {
    one: [0, 450],
    two: [2000, 250],
    three: [4000, 350],
    four: [6000, 380],
    five: [8000, 340],
    beat: [10000, 11163]
  }
});

// Define the tests to run.
var id;
var webaudio = [
  function(fn) {
    sound1.once('play', function() {
      label.innerHTML = 'PLAYING';
      setTimeout(fn, 2000);
    });
    
    id = sound1.play();
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
    sound1.rate(1.5, id);

    label.innerHTML = 'SPEED UP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.rate(1, id);

    label.innerHTML = 'SLOW DOWN';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound1.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT';
    sound1.once('fade', function() {
      fn();
    }, id);
  },

  function(fn) {
    sound1.fade(0, 1, 2000, id);

    label.innerHTML = 'FADE IN';
    sound1.once('fade', function() {
      fn();
    }, id);
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
    id = sound1.play();

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
    sound1.once('fade', function() {
      if (sound1._onfade.length === 0) {
        fn();
      }
    });
  },

  function(fn) {
    sound1.fade(0, 1, 2000);

    label.innerHTML = 'FADE IN GROUP';
    sound1.once('fade', function() {
      if (sound1._onfade.length === 0) {
        fn();
      }
    });
  },

  function(fn) {
    sound1.stop();

    label.innerHTML = 'STOP GROUP';
    setTimeout(fn, 1500);
  },

  function(fn) {
    id = sound3.play('beat');

    label.innerHTML = 'PLAY SPRITE';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound3.pause(id);

    label.innerHTML = 'PAUSE SPRITE';
    setTimeout(fn, 1000);
  },

  function(fn) {
    sound3.play(id);

    label.innerHTML = 'RESUME SPRITE';
    setTimeout(fn, 1500);
  },

  function(fn) {
    var sounds = ['one', 'two', 'three', 'four', 'five'];
    for (var i=0; i<sounds.length; i++) {
      setTimeout(function(i) {
        sound3.play(sounds[i]);
      }.bind(null, i), i * 500);
    }

    label.innerHTML = 'MULTIPLE SPRITES';
    setTimeout(fn, 3000);
  },

  function(fn) {
    var sprite = sound3.play('one');
    sound3.loop(true, sprite);

    label.innerHTML = 'LOOP SPRITE';
    setTimeout(function() {
      sound3.loop(false, sprite);
      fn();
    }, 3000);
  },

  function(fn) {
    sound3.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT SPRITE';
    sound3.once('fade', function() {
      fn();
    });
  }
];

var html5 = [
   function(fn) {
    id = sound2.play();

    logo.style.display = 'block';
    label.innerHTML = 'PLAYING';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.pause(id);

    label.innerHTML = 'PAUSED';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound2.play(id);

    label.innerHTML = 'RESUMING';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.stop(id);

    label.innerHTML = 'STOPPED';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound2.play(id);

    label.innerHTML = 'PLAY FROM START';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.rate(1.5, id);

    label.innerHTML = 'SPEED UP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.rate(1, id);

    label.innerHTML = 'SLOW DOWN';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT';
    sound2.once('fade', function() {
      fn();
    });
  },

  function(fn) {
    sound2.fade(0, 1, 2000, id);

    label.innerHTML = 'FADE IN';
    sound2.once('fade', function() {
      fn();
    });
  },

  function(fn) {
    sound2.mute(true, id);

    label.innerHTML = 'MUTE';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound2.mute(false, id);

    label.innerHTML = 'UNMUTE';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.volume(0.5, id);

    label.innerHTML = 'HALF VOLUME';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.volume(1, id);

    label.innerHTML = 'FULL VOLUME';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.seek(0, id);

    label.innerHTML = 'SEEK TO START';
    setTimeout(fn, 2000);
  },

  function(fn) {
    id = sound2.play();

    label.innerHTML = 'PLAY 2ND';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.mute(true);

    label.innerHTML = 'MUTE GROUP';
    setTimeout(fn, 1500);
  },

  function(fn) {
    sound2.mute(false);

    label.innerHTML = 'UNMUTE GROUP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.volume(0.5);

    label.innerHTML = 'HALF VOLUME GROUP';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound2.fade(0.5, 0, 2000);

    label.innerHTML = 'FADE OUT GROUP';
    sound2.once('fade', function() {
      if (sound2._onfade.length === 0) {
        fn();
      }
    });
  },

  function(fn) {
    sound2.fade(0, 1, 2000);

    label.innerHTML = 'FADE IN GROUP';
    sound2.once('fade', function() {
      if (sound2._onfade.length === 0) {
        fn();
      }
    });
  },

  function(fn) {
    sound2.stop();

    label.innerHTML = 'STOP GROUP';
    setTimeout(fn, 1500);
  },

  function(fn) {
    id = sound4.play('beat');

    label.innerHTML = 'PLAY SPRITE';
    setTimeout(fn, 2000);
  },

  function(fn) {
    sound4.pause(id);

    label.innerHTML = 'PAUSE SPRITE';
    setTimeout(fn, 1000);
  },

  function(fn) {
    sound4.play(id);

    label.innerHTML = 'RESUME SPRITE';
    setTimeout(fn, 1500);
  },

  function(fn) {
    var sounds = ['one', 'two', 'three', 'four', 'five'];
    for (var i=0; i<sounds.length; i++) {
      setTimeout(function(i) {
        sound4.play(sounds[i]);
      }.bind(null, i), i * 500);
    }

    label.innerHTML = 'MULTIPLE SPRITES';
    setTimeout(fn, 3000);
  },

  function(fn) {
    sound4.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT SPRITE';
    sound4.once('fade', function() {
      fn();
    });
  }
];

// If Web Audio is available, use both tets; otherwise, just hTML5.
var tests = Howler.usingWebAudio ? webaudio.concat(html5) : html5;

// Create a method that will call the next in the series.
var chain = function(i) {
  return function() {
    if (tests[i]) {
      tests[i](chain(++i));
    } else {
      logo.style.display = 'none';
      label.innerHTML = 'COMPLETE!';
      label.style.color = '#74b074';
    }
  };
};

// Listen to a click on the button to being the tests.
var start = document.getElementById('start');
start.addEventListener('click', function() {
  tests[0](chain(1));
  start.style.display = 'none';
}, false);