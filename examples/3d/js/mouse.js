const Mouse = (function () {
  var _x, _y;
  var animationFrame;
  var waitAnime = 0;
  const RADIUS = 2;
  const pointerImg = new Texture("./assets/cursor.png", 44, 44);
  const canvas = document.getElementById("hud");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  _x = canvas.width / 2;
  _y = canvas.height / 2;
  const ctx = canvas.getContext("2d");

  function setup({ onRotate, onMoveStart, onMoveStop }) {
    canvas.requestPointerLock();

    canvas.onmousedown = function (e) {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        _x = e.offsetX;
        _y = e.offsetY;
        drawCursor();
      }
      if (e.buttons === 3) {
        onMoveStart && onMoveStart();
      }
      if (e.buttons >= 2) {
        e.preventDefault(); //right click;
      }
    };
    canvas.onmouseup = function (e) {
      e.buttons === 0 && onMoveStop && onMoveStop();
    };
    canvas.onmousemove = (e) => {
      if (e.buttons > 0 && onRotate && waitAnime === 0) {
        _console.log(
          e.movementX +
            " / " +
            canvas.width +
            " = " +
            Math.atan(e.movementX / canvas.width / 25)
        );
        onRotate(Math.atan(e.movementX / canvas.width / 25));
        waitAnime = 1;
        e.preventDefault();
      }
      _x += e.movementX;
      _y += e.movementY;
      if (_x > canvas.width) _x -= RADIUS;
      if (_x < 0) _x += RADIUS;
      if (_y > canvas.height) _y -= RADIUS;
      if (_y < 0) _y -= RADIUS;
      ctx.translate(e.movementX, e.movementY);
      drawCursor();
    };
    //  drawCursor();
  }

  function drawCursor() {
    if (!animationFrame && document.pointerLockElement == canvas) {
      animationFrame = requestAnimationFrame(function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(pointerImg.image, _x, _y, 55, 55);
        animationFrame = null;
        waitAnime = 0;
      });
    }
  }
  return {
    setup,
    drawCursor,
  };
})();
