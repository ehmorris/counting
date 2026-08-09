import { GRAVITY, INTERVAL } from "./constants.js";

// Everything that moves is a particle: the balls, the pieces they break into,
// and the sparks thrown clear of a pop. A particle is deliberately small. A
// ball used to be built out of ninety more balls, so popping one allocated
// ninety full ball objects — each poppable in turn, each carrying its own pop
// machinery — inside a click handler
export const makeParticle = (
  canvasManager,
  {
    radius,
    startPosition,
    startVelocity,
    gravity = GRAVITY,
    terminalVelocity = Infinity,
    // Balls and their pieces stay inside the walls. Nothing bounces off the
    // top, since balls drop in from above the screen
    bounce = false,
  }
) => {
  const velocityRetainedOnBounce = 0.5;
  let position = { ...startPosition };
  let velocity = { ...startVelocity };

  const update = (deltaTime) => {
    const deltaTimeMultiplier = deltaTime / INTERVAL;
    position.x += deltaTimeMultiplier * velocity.x;
    position.y += deltaTimeMultiplier * velocity.y;
    // Clamps velocity, not per-frame distance, which would make the fall
    // speed depend on the frame rate
    velocity.y = Math.min(
      velocity.y + deltaTimeMultiplier * gravity,
      terminalVelocity
    );

    if (bounce) {
      if (position.x > canvasManager.getWidth() - radius) {
        position.x = canvasManager.getWidth() - radius;
        velocity.x *= -velocityRetainedOnBounce;
      } else if (position.x < radius) {
        position.x = radius;
        velocity.x *= -velocityRetainedOnBounce;
      }

      if (position.y > canvasManager.getHeight() - radius) {
        position.y = canvasManager.getHeight() - radius;
        velocity.y *= -velocityRetainedOnBounce;
      }
    }
  };

  // Drawing something that has left the screen costs the same as drawing
  // something that hasn't. Shrinking pieces pass their current radius
  const inViewport = (currentRadius = radius) =>
    position.x < canvasManager.getWidth() + currentRadius &&
    position.x > -currentRadius &&
    position.y < canvasManager.getHeight() + currentRadius &&
    position.y > -currentRadius;

  return {
    update,
    inViewport,
    getPosition: () => position,
    getRadius: () => radius,
    getVelocity: () => velocity,
    setPosition: (passedPosition) => (position = passedPosition),
    setVelocity: (passedVelocity) => (velocity = passedVelocity),
  };
};
