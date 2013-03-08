define(["jquery", "Howler", "Howl"], function($, Howler, Howl) 
{

  if (window.Howler) {
    alert("Howler is still in global scope")
  }

  if (window.Howl) {
    alert("Howl still in global scope")
  }

  bonk = new Howl({
    urls: ["/test/bonk.mp3", "/test/bonk.ogg"]
  });

  $(function() {
    $('#play-bonk').on('click', function() {
      bonk.play();
    });
  });

});
