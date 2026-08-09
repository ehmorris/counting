import { GRAVITY } from "./constants.js";
import { makeParticle } from "./particle.js";
import {
  progress,
  clampedProgress,
  transition,
  randomBetween,
  getHeadingInRadsFromTwoPoints,
} from "./helpers.js";
import { easeOutCubic } from "./easings.js";

// The ember color a pop's sparks burn at
const sparkColor = "oklch(74.2% 0.2146 50.82)";

export const makeBall = (
  canvasManager,
  { startPosition, startVelocity, radius, fill },
  onPop
) => {
  const CTX = canvasManager.getContext();
  const popAnimationDurationMax = 2400;
  const popAnimationDuration = randomBetween(
    popAnimationDurationMax - 800,
    popAnimationDurationMax
  );
  const terminalVelocity = 10;

  let popped = false;
  let poppedTime = false;
  let poppedPieces = [];
  let sparks = [];
  let popOrigin = false;
  let gone = false;

  const baseParticle = makeParticle(canvasManager, {
    radius,
    startPosition,
    startVelocity,
    gravity: GRAVITY,
    terminalVelocity,
    bounce: true,
  });

  const isRemaining = () => !popped && !gone;

  const isPopping = () => popped && !gone;

  // A ball counts, and can be tapped, once it has dropped far enough past the
  // top edge to be seen
  const onScreen = () =>
    isRemaining() && baseParticle.getPosition().y > -radius / 2;

  const update = (deltaTime) => {
    if (gone) return;

    if (popped) {
      if (Date.now() - poppedTime > popAnimationDurationMax) {
        gone = true;
        poppedPieces = [];
        sparks = [];
        return;
      }

      poppedPieces.forEach(({ particle }) => particle.update(deltaTime));
      sparks.forEach((spark) => spark.update(deltaTime));
    } else {
      baseParticle.update(deltaTime);
    }
  };

  const pop = () => {
    // Two fingers can land on the same ball in one touchstart. Without this
    // the pop animation restarts and the ball counts as popped twice
    if (popped) return;

    popped = true;
    poppedTime = Date.now();
    popOrigin = { ...baseParticle.getPosition() };
    const popVelocity = { ...baseParticle.getVelocity() };

    // A popped ball is composed of many tiny pieces. The first frame after the
    // pop, we want them to cluster together to form a shape that still looks
    // mostly like the ball, and then we want each of them to explode outwards.
    // This is accomplished by creating a ring of small to medium sized pieces
    // around the outer edge, and also a cluster of larger pieces in a smaller
    // ring close to the center. They all move outwards at different speeds
    const makeRing = (
      count,
      { minSize, maxSize, innerMargin, maxSpeed, minSpeed, velocityFraction }
    ) =>
      new Array(count).fill().map(() => {
        const randomAngle = Math.random() * Math.PI * 2;
        const randomSize = randomBetween(minSize, maxSize);
        const randomSpeedMultiplier = transition(
          maxSpeed,
          minSpeed,
          progress(1, maxSize, randomSize)
        );

        return {
          // Each piece fades out on its own schedule so they don't all wink
          // out of existence on the same frame
          shrinkDuration: randomBetween(
            popAnimationDurationMax - 800,
            popAnimationDurationMax
          ),
          particle: makeParticle(canvasManager, {
            radius: randomSize,
            startPosition: {
              x: popOrigin.x + Math.cos(randomAngle) * (radius - innerMargin),
              y: popOrigin.y + Math.sin(randomAngle) * (radius - innerMargin),
            },
            // Pieces keep some of the velocity of the parent ball, but mostly
            // head straight out from its center at the given randomAngle
            startVelocity: {
              x:
                popVelocity.x * velocityFraction +
                Math.cos(randomAngle) * randomSpeedMultiplier,
              y:
                popVelocity.y * velocityFraction +
                Math.sin(randomAngle) * randomSpeedMultiplier,
            },
            gravity: GRAVITY,
            terminalVelocity,
            bounce: true,
          }),
        };
      });

    // A big ball should shatter into more pieces than a small one, and the
    // pieces themselves are sized against it so a pop reads the same at any
    // ball size
    const numberOfPopPieces = Math.round(
      transition(18, 60, clampedProgress(30, 120, radius))
    );

    poppedPieces = makeRing(numberOfPopPieces, {
      minSize: radius / 22,
      maxSize: radius / 5,
      innerMargin: radius / 4,
      maxSpeed: 7,
      minSpeed: 1.2,
      velocityFraction: 1 / 4,
    }).concat(
      makeRing(Math.round(numberOfPopPieces / 2), {
        minSize: radius / 7,
        maxSize: radius / 3,
        innerMargin: radius / 2,
        maxSpeed: 8,
        minSpeed: 2,
        velocityFraction: 1 / 2,
      })
    );

    // Long thin embers thrown clear of the burst and falling slowly
    sparks = new Array(16).fill().map(() => {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomLength = randomBetween(20, 50);
      const randomSpeedMultiplier = randomBetween(8, 16);

      return makeParticle(canvasManager, {
        // A spark's radius stands in for its length
        radius: randomLength,
        startPosition: {
          x: popOrigin.x + Math.cos(randomAngle) * radius,
          y: popOrigin.y + Math.sin(randomAngle) * radius,
        },
        startVelocity: {
          x:
            popVelocity.x / 3 + Math.cos(randomAngle) * randomSpeedMultiplier,
          y:
            popVelocity.y / 3 + Math.sin(randomAngle) * randomSpeedMultiplier,
        },
        gravity: 0.02,
        terminalVelocity: 110,
      });
    });

    onPop();
  };

  const draw = () => {
    if (gone) return;

    if (popped) {
      const timeSincePopped = Date.now() - poppedTime;

      // Every piece of a ball is the same color, so they can all go into one
      // path and be rasterized in a single fill instead of ninety
      CTX.save();
      CTX.fillStyle = fill;
      CTX.beginPath();

      poppedPieces.forEach(({ particle, shrinkDuration }) => {
        // Shrinking via the radius rather than a transform is what lets the
        // pieces share a path. clampedProgress matters here: an eased value
        // past 1 would produce a negative radius, which arc() throws on
        const scaledRadius =
          particle.getRadius() *
          transition(
            1,
            0,
            clampedProgress(0, shrinkDuration, timeSincePopped),
            easeOutCubic
          );

        if (scaledRadius > 0 && particle.inViewport(scaledRadius)) {
          const { x, y } = particle.getPosition();
          // Without a moveTo, each arc is joined to the previous one by a line
          CTX.moveTo(x + scaledRadius, y);
          CTX.arc(x, y, scaledRadius, 0, 2 * Math.PI);
        }
      });

      CTX.fill();
      CTX.restore();

      // Embers are all one color and one width, so they go into a single
      // stroked path rather than each one costing its own transform
      CTX.save();
      CTX.strokeStyle = sparkColor;
      CTX.lineWidth = 1;
      CTX.beginPath();

      sparks.forEach((spark) => {
        const length = transition(
          spark.getRadius(),
          0,
          clampedProgress(0, popAnimationDuration, timeSincePopped),
          easeOutCubic
        );

        if (length > 0 && spark.inViewport(length)) {
          const { x, y } = spark.getPosition();
          // Each ember trails back towards the burst it came from
          const heading = getHeadingInRadsFromTwoPoints(popOrigin, { x, y });

          CTX.moveTo(x, y);
          CTX.lineTo(
            x + Math.cos(heading) * length,
            y + Math.sin(heading) * length
          );
        }
      });

      CTX.stroke();
      CTX.restore();
    } else if (onScreen()) {
      const { x, y } = baseParticle.getPosition();

      CTX.save();
      CTX.fillStyle = fill;
      CTX.beginPath();
      CTX.arc(x, y, radius, 0, 2 * Math.PI);
      CTX.fill();
      CTX.restore();
    }
  };

  return {
    update,
    draw,
    pop,
    getPosition: baseParticle.getPosition,
    getVelocity: baseParticle.getVelocity,
    getRadius: baseParticle.getRadius,
    setPosition: baseParticle.setPosition,
    setVelocity: baseParticle.setVelocity,
    getFill: () => fill,
    isPopped: () => popped,
    isRemaining,
    isPopping,
    isGone: () => gone,
    onScreen,
  };
};

export const checkBallCollision = (ballA, ballB) => {
  const rSum = ballA.getRadius() + ballB.getRadius();
  const dx = ballB.getPosition().x - ballA.getPosition().x;
  const dy = ballB.getPosition().y - ballA.getPosition().y;
  return [rSum * rSum > dx * dx + dy * dy, rSum - Math.sqrt(dx * dx + dy * dy)];
};

export const resolveBallCollision = (ballA, ballB) => {
  const relativeVelocity = {
    x: ballB.getVelocity().x - ballA.getVelocity().x,
    y: ballB.getVelocity().y - ballA.getVelocity().y,
  };

  const norm = {
    x: ballB.getPosition().x - ballA.getPosition().x,
    y: ballB.getPosition().y - ballA.getPosition().y,
  };
  const mag = Math.sqrt(norm.x * norm.x + norm.y * norm.y);

  // Perfectly overlapping balls have no normal to push along, and the NaN
  // that falls out of dividing by zero would remove them from play for good
  if (mag === 0) return;

  norm.x /= mag;
  norm.y /= mag;

  const velocityAlongNorm =
    relativeVelocity.x * norm.x + relativeVelocity.y * norm.y;

  if (velocityAlongNorm > 0) return;

  const bounce = 0.7;
  let j = -(1 + bounce) * velocityAlongNorm;
  j /= 1 / ballA.getRadius() + 1 / ballB.getRadius();
  const impulse = { x: j * norm.x, y: j * norm.y };

  ballA.setVelocity({
    x: ballA.getVelocity().x - (1 / ballA.getRadius()) * impulse.x,
    y: ballA.getVelocity().y - (1 / ballA.getRadius()) * impulse.y,
  });

  ballB.setVelocity({
    x: ballB.getVelocity().x + (1 / ballB.getRadius()) * impulse.x,
    y: ballB.getVelocity().y + (1 / ballB.getRadius()) * impulse.y,
  });
};

export const adjustBallPositions = (ballA, ballB, depth) => {
  const percent = 0.2;
  const slop = 0.01;
  let correctionNum =
    (Math.max(depth - slop, 0) /
      (1 / ballA.getRadius() + 1 / ballB.getRadius())) *
    percent;

  const norm = {
    x: ballB.getPosition().x - ballA.getPosition().x,
    y: ballB.getPosition().y - ballA.getPosition().y,
  };
  const mag = Math.sqrt(norm.x * norm.x + norm.y * norm.y);

  if (mag === 0) return;

  norm.x /= mag;
  norm.y /= mag;

  const correction = { x: correctionNum * norm.x, y: correctionNum * norm.y };

  ballA.setPosition({
    x: ballA.getPosition().x - (1 / ballA.getRadius()) * correction.x,
    y: ballA.getPosition().y - (1 / ballA.getRadius()) * correction.y,
  });
  ballB.setPosition({
    x: ballB.getPosition().x + (1 / ballB.getRadius()) * correction.x,
    y: ballB.getPosition().y + (1 / ballB.getRadius()) * correction.y,
  });
};
