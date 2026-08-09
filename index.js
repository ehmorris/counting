import { makeCanvasManager } from "./canvas.js";
import { animate, findBallAtPoint, randomBetween } from "./helpers.js";
import {
  checkBallCollision,
  adjustBallPositions,
  resolveBallCollision,
  makeBall,
} from "./ball.js";
import { makeRipple } from "./ripple.js";
import { makeAudioManager } from "./audio.js";
import { randomBallColor, white } from "./colors.js";
import {
  allNumberPaths,
  letterBoundingBoxWidth,
  letterBoundingBoxHeight,
} from "./numberPaths.js";

// TODO
// - Better number change animation

const canvasManager = makeCanvasManager({
  initialWidth: window.innerWidth,
  initialHeight: window.innerHeight,
  attachNode: "#canvas",
});
const audioManager = makeAudioManager();
const CTX = canvasManager.getContext();
const startingNumber = 10;
let balls;
let ripples;

function countVisibleBalls() {
  return balls.reduce((acc, cur) => acc + (cur.onScreen() ? 1 : 0), 0);
}

function countRemainingBalls() {
  return balls.reduce((acc, cur) => acc + (cur.isRemaining() ? 1 : 0), 0);
}

function restartGame() {
  const ballSize = Math.max(
    44,
    Math.min(canvasManager.getWidth(), canvasManager.getHeight()) / 10
  );

  if (Array.isArray(balls) && balls.length) {
    balls = balls.filter((b) => b.isPopping());
  } else {
    balls = [];
  }

  balls = balls.concat(
    new Array(startingNumber).fill().map((_, ballIndex) => {
      const spacingBetweenBalls = ballSize * 6;
      const ballY =
        -(ballSize + spacingBetweenBalls) * ballIndex - ballSize * 2;
      const spawnMargin = Math.max(ballSize, canvasManager.getWidth() / 8);

      return makeBall(
        canvasManager,
        {
          startPosition: {
            x: randomBetween(
              spawnMargin,
              canvasManager.getWidth() - spawnMargin
            ),
            y: ballY,
          },
          startVelocity: { x: randomBetween(-4, 4), y: 0 },
          radius: ballSize,
          fill: randomBallColor(),
        },
        onPop
      );
    })
  );

  ripples = [];
}
restartGame();

document.addEventListener("pointerdown", handleBallClick);

document.addEventListener("touchmove", (e) => e.preventDefault(), {
  passive: false,
});

animate((deltaTime) => {
  CTX.clearRect(0, 0, canvasManager.getWidth(), canvasManager.getHeight());

  // Calculate new positions for all balls
  balls.forEach((b) => b.update(deltaTime));

  // A ball whose pop animation has finished is still walked by the collision
  // loop and still handed to draw until it's out of the array
  balls = balls.filter((b) => !b.isGone());

  // Draw number
  CTX.save();
  CTX.fillStyle = white;
  CTX.translate(canvasManager.getWidth() / 2, canvasManager.getHeight() / 2);
  const scaleFactor = Math.min(
    canvasManager.getHeight() / letterBoundingBoxHeight,
    canvasManager.getWidth() / letterBoundingBoxWidth
  );
  CTX.scale(scaleFactor, scaleFactor);
  CTX.translate(-letterBoundingBoxWidth / 2, -letterBoundingBoxHeight / 2);
  // CTX.fill(undefined) fills the current path rather than nothing
  const numberPath = allNumberPaths[countVisibleBalls()];
  if (numberPath) CTX.fill(numberPath);
  CTX.restore();

  // Run collision detection, visiting each pair once
  const ballsInPlay = balls.filter((b) => b.isRemaining());
  for (let a = 0; a < ballsInPlay.length; a++) {
    for (let b = a + 1; b < ballsInPlay.length; b++) {
      const ballA = ballsInPlay[a];
      const ballB = ballsInPlay[b];
      const collision = checkBallCollision(ballA, ballB);
      if (collision[0]) {
        adjustBallPositions(ballA, ballB, collision[1]);
        resolveBallCollision(ballA, ballB);
      }
    }
  }

  // Draw ripples and balls
  ripples = ripples.filter((r) => !r.isGone());
  ripples.forEach((r) => r.draw());
  balls.forEach((b) => b.draw());
});

function handleBallClick({ clientX: x, clientY: y }) {
  const collidingBall = findBallAtPoint(balls, { x, y });

  if (collidingBall) {
    collidingBall.pop();
    audioManager.playRandomPluck();
  } else {
    ripples.push(makeRipple(canvasManager, { x, y }));
    audioManager.playMiss();
  }
}

function onPop() {
  // Counts unpopped balls, not visible ones, so the round doesn't end early
  // while balls are still dropping in from above the top of the screen
  if (countRemainingBalls() <= 0) {
    restartGame();
    audioManager.playLevel();
  }
}
