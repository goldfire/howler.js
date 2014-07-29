// Define the tests to run.
var tests = [
  // .
  function(fn) {
    fn();
  },

  // .
  function(fn) {
    fn();
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
document.getElementById('start').addEventListener('click', function() {
  tests[0](chain(1));
}, false);