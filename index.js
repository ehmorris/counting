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
import { randomColor, white } from "./colors.js";

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
  return balls.reduce((acc, cur) => acc + cur.onScreen(), 0);
}

function restartGame() {
  const ballSize =
    Math.min(canvasManager.getWidth(), canvasManager.getHeight()) / 8;

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

      return makeBall(
        canvasManager,
        {
          startPosition: {
            x: randomBetween(
              canvasManager.getWidth() / 8,
              canvasManager.getWidth() - canvasManager.getWidth() / 8
            ),
            y: ballY,
          },
          startVelocity: { x: randomBetween(-4, 4), y: 0 },
          radius: ballSize,
          fill: randomColor(),
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

  CTX.save();
  CTX.translate(canvasManager.getWidth() / 2, canvasManager.getHeight() / 2);
  CTX.font = `800 80vmin -apple-system, BlinkMacSystemFont, sans-serif`;
  CTX.fillStyle = white;
  CTX.textAlign = "center";
  CTX.textBaseline = "middle";
  CTX.fillText(countVisibleBalls(), 0, 0);
  CTX.restore();

  // Run collision detection
  const ballsInPlay = balls.filter((b) => b.isRemaining());
  ballsInPlay.forEach((ballA) => {
    ballsInPlay.forEach((ballB) => {
      if (ballA !== ballB) {
        const collision = checkBallCollision(ballA, ballB);
        if (collision[0]) {
          adjustBallPositions(ballA, ballB, collision[1]);
          resolveBallCollision(ballA, ballB);
        }
      }
    });
  });

  // Draw ripples and balls
  ripples.forEach((r) => r.draw());
  balls.forEach((b) => b.draw(deltaTime));
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
  if (countVisibleBalls() <= 0) {
    restartGame();
    audioManager.playLevel();
  }
}
