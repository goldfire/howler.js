import { Howl, Howler } from '../../dist/core.js';

// Cache the label for later use.
const label = document.getElementById('label');
const start = document.getElementById('start');

// Setup the sounds to be used.
const sound1 = new Howl({
  src: ['audio/sound1.webm', 'audio/sound1.mp3'],
});

const sound2 = new Howl({
  src: ['audio/sound2.webm', 'audio/sound2.mp3'],
  sprite: {
    one: [0, 450],
    two: [2000, 250],
    three: [4000, 350],
    four: [6000, 380],
    five: [8000, 340],
    beat: [10000, 11163],
  },
});

// Enable the start button when the sounds have loaded.
sound1.once('load', () => {
  start.removeAttribute('disabled');
  start.innerHTML = 'BEGIN CORE TESTS';
});

// Define the tests to run.
let id;
const tests = [
  (fn) => {
    sound1.once('play', () => {
      label.innerHTML = 'PLAYING';
      setTimeout(fn, 2000);
    });

    id = sound1.play();
  },

  (fn) => {
    sound1.pause(id);

    label.innerHTML = 'PAUSED';
    setTimeout(fn, 1500);
  },

  (fn) => {
    sound1.play(id);

    label.innerHTML = 'RESUMING';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.stop(id);

    label.innerHTML = 'STOPPED';
    setTimeout(fn, 1500);
  },

  (fn) => {
    sound1.play(id);

    label.innerHTML = 'PLAY FROM START';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.rate(1.5, id);

    label.innerHTML = 'SPEED UP';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.rate(1, id);

    label.innerHTML = 'SLOW DOWN';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT';
    sound1.once(
      'fade',
      () => {
        fn();
      },
      id,
    );
  },

  (fn) => {
    sound1.fade(0, 1, 2000, id);

    label.innerHTML = 'FADE IN';
    sound1.once(
      'fade',
      () => {
        fn();
      },
      id,
    );
  },

  (fn) => {
    sound1.mute(true, id);

    label.innerHTML = 'MUTE';
    setTimeout(fn, 1500);
  },

  (fn) => {
    sound1.mute(false, id);

    label.innerHTML = 'UNMUTE';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.volume(0.5, id);

    label.innerHTML = 'HALF VOLUME';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.volume(1, id);

    label.innerHTML = 'FULL VOLUME';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.seek(0, id);

    label.innerHTML = 'SEEK TO START';
    setTimeout(fn, 2000);
  },

  (fn) => {
    id = sound1.play();

    label.innerHTML = 'PLAY 2ND';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.mute(true);

    label.innerHTML = 'MUTE GROUP';
    setTimeout(fn, 1500);
  },

  (fn) => {
    sound1.mute(false);

    label.innerHTML = 'UNMUTE GROUP';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.volume(0.5);

    label.innerHTML = 'HALF VOLUME GROUP';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound1.fade(0.5, 0, 2000);

    label.innerHTML = 'FADE OUT GROUP';
    sound1.once('fade', () => {
      if (sound1._onfade.length === 0) {
        fn();
      }
    });
  },

  (fn) => {
    sound1.fade(0, 1, 2000);

    label.innerHTML = 'FADE IN GROUP';
    sound1.once('fade', () => {
      if (sound1._onfade.length === 0) {
        fn();
      }
    });
  },

  (fn) => {
    sound1.stop();

    label.innerHTML = 'STOP GROUP';
    setTimeout(fn, 1500);
  },

  (fn) => {
    id = sound2.play('beat');

    label.innerHTML = 'PLAY SPRITE';
    setTimeout(fn, 2000);
  },

  (fn) => {
    sound2.pause(id);

    label.innerHTML = 'PAUSE SPRITE';
    setTimeout(fn, 1000);
  },

  (fn) => {
    sound2.play(id);

    label.innerHTML = 'RESUME SPRITE';
    setTimeout(fn, 1500);
  },

  (fn) => {
    const sounds = ['one', 'two', 'three', 'four', 'five'];
    for (let i = 0; i < sounds.length; i++) {
      setTimeout(
        ((i) => {
          sound2.play(sounds[i]);
        }).bind(null, i),
        i * 500,
      );
    }

    label.innerHTML = 'MULTIPLE SPRITES';
    setTimeout(fn, 3000);
  },

  (fn) => {
    const sprite = sound2.play('one');
    sound2.loop(true, sprite);

    label.innerHTML = 'LOOP SPRITE';
    setTimeout(() => {
      sound2.loop(false, sprite);
      fn();
    }, 3000);
  },

  (fn) => {
    sound2.fade(1, 0, 2000, id);

    label.innerHTML = 'FADE OUT SPRITE';
    sound2.once('fade', () => {
      fn();
    });
  },
];

// Create a method that will call the next in the series.
const chain = (i) => {
  return () => {
    if (tests[i]) {
      tests[i](chain(++i));
    } else {
      label.innerHTML = 'COMPLETE!';
      label.style.color = '#74b074';

      // Wait for 5 seconds and then go back to the tests index.
      setTimeout(() => {
        window.location = './';
      }, 5000);
    }
  };
};

// If Web Audio isn't available, send them to hTML5 test.
if (Howler.usingWebAudio) {
  // Listen to a click on the button to being the tests.
  start.addEventListener(
    'click',
    () => {
      tests[0](chain(1));
      start.style.display = 'none';
    },
    false,
  );
} else {
  window.location = 'core.html5audio.html';
}
