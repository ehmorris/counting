export const makeCanvasManager = ({
  initialWidth,
  initialHeight,
  attachNode,
}) => {
  let width = initialWidth;
  let height = initialHeight;
  const element = document.createElement("canvas");
  const context = element.getContext("2d");
  // Re-read on resize, since zooming and moving to another display both
  // change devicePixelRatio
  let scale = window.devicePixelRatio || 1;

  const setCanvasSize = () => {
    scale = window.devicePixelRatio || 1;
    element.style.width = width + "px";
    element.style.height = height + "px";
    element.width = Math.floor(width * scale);
    element.height = Math.floor(height * scale);
    context.scale(scale, scale);
  };

  setCanvasSize();

  document.querySelector(attachNode).appendChild(element);

  window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;
    setCanvasSize();
  });

  return {
    getContext: () => context,
    getWidth: () => width,
    getHeight: () => height,
    getScaleFactor: () => scale,
  };
};
