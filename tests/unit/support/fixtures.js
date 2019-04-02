var fixtureAudioUrl = (function() {
  var fixtureBaseUrl = 'http://localhost:9876/base/tests/audio/';
  var cacheInvalidationCounter = 0;

  return function() {
    cacheInvalidationCounter += 1;
    return fixtureBaseUrl + 'sound1.mp3?i=' + cacheInvalidationCounter;
  };
}());
