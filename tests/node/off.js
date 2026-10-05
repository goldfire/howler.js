var assert = require('assert');
var Howl = require('../../src/howler.core.js').Howl;

function makeHowl() {
  var howl = Object.create(Howl.prototype);
  howl._onend = [];
  return howl;
}

var howl = makeHowl();
var first = function() {};
var second = function() {};
var other = function() {};

howl.on('end', first, 7);
howl.on('end', second, 7);
howl.on('end', other, 8);
howl.on('end', other);
assert.strictEqual(howl.off('end', undefined, 7), howl);
assert.deepStrictEqual(howl._onend.map(function(listener) { return listener.id; }), [8, undefined]);

howl.on('end', first, 7);
howl.on('end', second, 7);
howl.off('end', 7);
assert.deepStrictEqual(howl._onend.map(function(listener) { return listener.id; }), [8, undefined]);

howl.on('end', first, 7);
howl.on('end', second, 7);
howl.off('end', first, 7);
assert.strictEqual(howl._onend.some(function(listener) { return listener.fn === first; }), false);
assert.strictEqual(howl._onend.some(function(listener) { return listener.fn === second; }), true);

console.log('Sound-scoped event listener removal passed.');
