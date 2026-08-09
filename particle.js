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
  const momentumTransferredToObstacle = 0.15;
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

  // Bounce off a much heavier thing — a piece of debris against a ball still
  // in play. The piece takes almost all of the impulse, but the ball does get
  // shoved a little, so a pop near the pile knocks it around
  const bounceOff = (obstacle) => {
    const obstaclePosition = obstacle.getPosition();
    const obstacleRadius = obstacle.getRadius();
    const rSum = radius + obstacleRadius;
    const dx = position.x - obstaclePosition.x;
    const dy = position.y - obstaclePosition.y;
    const distanceSquared = dx * dx + dy * dy;

    // Squared comparison first so the common case of a miss never pays for a
    // square root — every piece tests against every ball on every frame
    if (distanceSquared >= rSum * rSum || distanceSquared === 0) return;

    const distance = Math.sqrt(distanceSquared);
    const norm = { x: dx / distance, y: dy / distance };
    const obstacleVelocity = obstacle.getVelocity();
    const velocityAlongNorm =
      (velocity.x - obstacleVelocity.x) * norm.x +
      (velocity.y - obstacleVelocity.y) * norm.y;

    // Only the piece is lifted clear of the overlap. Correcting the ball's
    // position too would make a settled pile jump every time debris rained
    // through it, which is a different thing from being nudged
    position = {
      x: obstaclePosition.x + norm.x * rSum,
      y: obstaclePosition.y + norm.y * rSum,
    };

    // Already on its way out, so let it go rather than yanking it back in
    if (velocityAlongNorm > 0) return;

    // Mass by area, where the ball-to-ball collisions use mass by radius. It
    // barely changes how the piece bounces, but it decides how hard the piece
    // shoves back, and squaring the ratio is the difference between a burst
    // that bumps the pile and one that launches it
    const inverseMass = 1 / (radius * radius);
    const obstacleInverseMass = 1 / (obstacleRadius * obstacleRadius);
    const restitution = 0.7;
    const impulse =
      (-(1 + restitution) * velocityAlongNorm) /
      (inverseMass + obstacleInverseMass);

    velocity = {
      x: velocity.x + impulse * inverseMass * norm.x,
      y: velocity.y + impulse * inverseMass * norm.y,
    };

    // The ball gets a deliberately damped share rather than the equal and
    // opposite one. A whole burst lands on it within a few frames, and full
    // momentum transfer adds up to a launch instead of a bump
    obstacle.setVelocity({
      x:
        obstacleVelocity.x -
        impulse * obstacleInverseMass * momentumTransferredToObstacle * norm.x,
      y:
        obstacleVelocity.y -
        impulse * obstacleInverseMass * momentumTransferredToObstacle * norm.y,
    });
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
    bounceOff,
    getPosition: () => position,
    getRadius: () => radius,
    getVelocity: () => velocity,
    setPosition: (passedPosition) => (position = passedPosition),
    setVelocity: (passedVelocity) => (velocity = passedVelocity),
  };
};
