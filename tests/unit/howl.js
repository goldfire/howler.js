describe('Howl', function() {
  describe('with html5 audio', function() {
    includePlayerExamples({html5: true});
  });

  describe('with web audio', function() {
    includePlayerExamples({html5: false});
  });

  function includePlayerExamples(defaultOptions) {
    describe('#play', function() {
      it('sets playing to true once play event is emitted', function(done) {
        var howl = createHowl({
          src: [fixtureAudioUrl()]
        });

        howl.once('play', function() {
          expect(howl.playing()).to.eq(true);
          done();
        });

        howl.play();
      });
    });

    describe('#pause', function() {
      it('sets playing to false once pause event is emitted', function(done) {
        var howl = createHowl({
          src: [fixtureAudioUrl()]
        });

        howl.once('pause', function() {
          expect(howl.playing()).to.eq(false);
          done();
        });

        howl.play();
        howl.pause();
      });
    });

    function createHowl(options) {
      return new Howl(Object.assign({}, options, defaultOptions));
    }
  }
});
