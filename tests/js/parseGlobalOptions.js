// Set global options from query params
function parseValueFromEntry(entry) {
  var key = entry[0];
  var value = entry[1];
  var parsedValue = value;

  if (value.toLowerCase() === 'true') {
    parsedValue = true;
  } else if (value.toLowerCase() === 'false') {
    parsedValue = false;
  } else if (!isNaN(value)) {
    parsedValue = parseFloat(value);
  }

  return [key, parsedValue];
}

function setGlobalOptions(entry) {
  var key = entry[0];
  var value = entry[1];

  if (Howler.hasOwnProperty(key)) {
    Howler[key] = value;
  }
}

window.location.search
  .slice(1)
  .split('&')
  .filter(function(entry) { return entry[0]; })
  .map(function(pair) { return pair.split('='); })
  .map(parseValueFromEntry)
  .forEach(setGlobalOptions);
