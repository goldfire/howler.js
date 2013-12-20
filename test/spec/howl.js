describe('Howl', function () {

  it('should have an "on" method', function () {
    expect(Howl.prototype).to.respondTo('on');
  });

  it('should have an "off" method', function () {
    expect(Howl.prototype).to.respondTo('off');
  });

  describe('#on', function () {
    beforeEach(function () {
      this.howl = new Howl({autoplay: false});
    });

    afterEach(function () {
      delete this.howl;
    });

    it('should add a callback with default context when called with an event name and callback function', function (done) {

      this.howl.on('customEvent', function (data) {
        expect(data).to.be.undefined;
        done();
      });

      this.howl.on('customEvent');

    });

    it('should add a callback with a custom context when called with an event name, callback function, and context argument', function (done) {
      var that = this;

      this.howl.on('customEvent', function (data) {
        expect(this).to.equal(that);
        done();
      }, this);

      this.howl.on('customEvent');
    });

    it('should only trigger the callbacks registered to an event name', function () {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();

      this.howl.on('customEvent1', spy1);
      this.howl.on('customEvent2', spy2);
      this.howl.on('customEvent2');

      expect(spy2).to.be.calledOnce;
      expect(spy1).to.not.be.called;

    });
  });

  describe('#off', function () {
    beforeEach(function () {
      this.howl = new Howl({autoplay: false});
      this.spy = sinon.spy();
    });

    afterEach(function () {
      delete this.spy;
      delete this.howl;
    });

    it('should deregister all callbacks with an associated event name, if no callback is specified', function () {

      //Register the same function (spy) to the same event twice.
      this.howl.on('customEvent', this.spy);
      this.howl.on('customEvent', this.spy);

      //trigger the event to capture the call count, which should equal 2
      this.howl.on('customEvent');
      expect(this.spy).to.be.calledTwice;

      //Unsubscribe the event, and re-trigger and check that the function (spy) above has not been called again.
      this.howl.off('customEvent');
      this.howl.on('customEvent');

      expect(this.spy).to.be.calledTwice;

    });

    it('should deregister all callbacks with any context given an associated event name, the callback, and no context', function () {
      var spy2 = sinon.spy();
      this.howl.on('customEvent', this.spy);
      this.howl.on('customEvent', spy2);
      this.howl.on('customEvent');

      expect(this.spy.callCount + spy2.callCount).to.equal(2);

      //remove the specific callback.

      this.howl.off('customEvent', spy2);
      this.howl.on('customEvent');


      expect(this.spy.callCount + spy2.callCount).to.equal(2);

    });
    it('should deregister only the specific callback given an associated event name, the callback, and the context', function () {

      // bind the same function (spy), to the same event twice, but one with a non-default context

      this.howl.on('customEvent', this.spy, this);
      this.howl.on('customEvent', this.spy);

      //trigger the event and expect the call count to be two
      this.howl.on('customEvent');
      expect(this.spy).to.be.calledTwice;

      //deregister the event with the custom context, and re-trigger
      this.howl.off('customEvent', this.spy, this);
      this.howl.on('customEvent');

      //expect the outcome to be 3 calls, as we've deregistered one of them
      expect(this.spy).to.be.calledThrice;

    });
  });

});