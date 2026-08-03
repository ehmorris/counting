import { INTERVAL } from "./constants.js";

// Animation frames stop while a tab is backgrounded, so the first frame after
// returning can report a gap of many seconds. Feeding that straight into the
// physics teleports every ball through the walls, so cap how much time a
// single frame is allowed to advance the simulation.
const MAX_DELTA_TIME = INTERVAL * 4;

export const animate = (drawFunc) => {
  let previousTimestamp = null;

  const drawFuncContainer = (timestamp) => {
    const deltaTime =
      previousTimestamp === null
        ? 0
        : Math.min(timestamp - previousTimestamp, MAX_DELTA_TIME);
    drawFunc(deltaTime);
    window.requestAnimationFrame(drawFuncContainer);
    previousTimestamp = timestamp;
  };

  window.requestAnimationFrame(drawFuncContainer);
};

export const progress = (start, end, current) =>
  (current - start) / (end - start);

export const clampedProgress = (start, end, current) =>
  Math.max(0, Math.min(1, (current - start) / (end - start)));

export const transition = (start, end, progress, easingFunc) => {
  const easedProgress = easingFunc ? easingFunc(progress) : progress;
  return start + Math.sign(end - start) * Math.abs(end - start) * easedProgress;
};

export const randomBool = (probability = 0.5) => Math.random() >= probability;

export const randomBetween = (min, max) => Math.random() * (max - min) + min;

export const findBallAtPoint = (balls, { x, y }) => {
  return balls.find((ball) => {
    if (ball.isRemaining() && ball.onScreen()) {
      const dx = x - ball.getPosition().x;
      const dy = y - ball.getPosition().y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < ball.getRadius();
    }
  });
};
