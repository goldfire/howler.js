var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.resolve(__dirname, '../..');
var source = fs.readFileSync(path.join(root, 'src/howler.core.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'src/plugins/howler.spatial.js'), 'utf8');
var bundles = [
  source,
  fs.readFileSync(path.join(root, 'dist/howler.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'dist/howler.min.js'), 'utf8')
];

bundles.forEach(function(code) {
  // Server-side workers have globalThis, but neither window nor Node's global.
  var worker = { exports: {} };
  vm.runInNewContext(code, worker);
  assert.strictEqual(typeof worker.HowlerGlobal, 'function');
  assert.strictEqual(worker.Howler, worker.exports.Howler);
  assert.strictEqual(typeof worker.Howler.stereo, 'function');

  // Some bundlers provide a `global` shim that is not the global object.
  var shimmed = { exports: {}, global: {} };
  vm.runInNewContext(code, shimmed);
  assert.strictEqual(typeof shimmed.HowlerGlobal, 'function');
  assert.strictEqual(shimmed.global.HowlerGlobal, undefined);
  assert.strictEqual(typeof shimmed.Howler.stereo, 'function');

  // Older browsers still fall back to window when globalThis is unavailable.
  var legacy = { exports: {}, globalThis: undefined };
  legacy.window = legacy;
  vm.runInNewContext(code, legacy);
  assert.strictEqual(typeof legacy.HowlerGlobal, 'function');
  assert.strictEqual(typeof legacy.Howler.stereo, 'function');
});
