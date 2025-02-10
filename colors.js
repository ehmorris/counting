export const pink = "#EA98AA";
export const red = "#DF432A";
export const yellow = "#F4BF2A";
export const turquoise = "#79CAEC";
export const white = "#FCF6E8";

export const medblue = "#4555A5";
export const green = "#92C262";
export const purple = "#B565A9";
export const orange = "#F38121";
export const teal = "#51BFA4";

export const background = "#2D2D74";

const ballColors = [pink, red, yellow, turquoise];

export const randomBallColor = () =>
  ballColors[Math.floor(Math.random() * ballColors.length)];
