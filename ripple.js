import { easeOutCirc, easeInCubic } from "./easings.js";
import { clampedProgress, transition } from "./helpers.js";
import { red } from "./colors.js";

export const makeRipple = (canvasManager, startPosition) => {
  const CTX = canvasManager.getContext();
  const rippleDuration = 800;
  const rippleStart = Date.now();
  let position = { ...startPosition };
  let gone = false;

  const draw = () => {
    if (!gone) {
      const timeSinceRipple = Date.now() - rippleStart;
      if (timeSinceRipple > rippleDuration) gone = true;

      // easeOutCirc takes the square root of `1 - (x - 1)^2`, which is negative
      // once progress passes 2. An unclamped progress therefore turns the
      // scale and line width into NaN if a frame lands late enough.
      const animationProgress = clampedProgress(
        0,
        rippleDuration,
        timeSinceRipple
      );
      const opacityTransition = transition(
        1,
        0,
        animationProgress,
        easeInCubic
      );
      const scaleTransition = transition(
        0,
        2.5,
        animationProgress,
        easeOutCirc
      );
      const lineWidthTransition = transition(
        8,
        0,
        animationProgress,
        easeOutCirc
      );

      CTX.save();
      CTX.strokeStyle = red;
      CTX.globalAlpha = opacityTransition;
      CTX.lineWidth = lineWidthTransition;
      CTX.translate(position.x, position.y);
      CTX.scale(scaleTransition, scaleTransition);
      CTX.beginPath();
      CTX.arc(0, 0, 22, 0, 2 * Math.PI);
      CTX.closePath();
      CTX.stroke();
      CTX.restore();
    }
  };

  return {
    draw,
    isGone: () => gone,
  };
};
