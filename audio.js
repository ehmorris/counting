export const makeAudioManager = () => {
  const numberOfPlucks = 9;
  let hasInitialized = false;
  let audioCTX;
  let pluckBuffers = [];
  let missBuffer;
  let levelBuffer;
  let silenceAudio;

  async function _loadFile(context, filePath) {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Unable to fetch ${filePath}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  // A file that fails to load resolves to null rather than rejecting, so a
  // missing sound can never surface as an unhandled rejection or stop the
  // rest of the game from making noise.
  const _loadFileOrNull = (filePath) =>
    _loadFile(audioCTX, filePath).catch((error) => {
      console.error(error);
      return null;
    });

  const initialize = () => {
    if (!hasInitialized) {
      hasInitialized = true;

      // Play silence in a loop in the background on instantiation. Playing some
      // audio continuously with the HTML audio API will allow audio via the Web
      // Audio API to play on the main sound channel in iOS, rather than the
      // ringer channel.
      silenceAudio = new Audio("./sounds/silence.mp3");
      silenceAudio.loop = true;
      // Autoplay policies can reject this before a user gesture. It's only an
      // iOS routing hint, so a failure here shouldn't break anything else.
      Promise.resolve(silenceAudio.play()).catch(() => {});

      audioCTX = new AudioContext();
      pluckBuffers = new Array(numberOfPlucks)
        .fill()
        .map((_, index) => _loadFileOrNull(`./sounds/pluck${index + 1}.mp3`));
      missBuffer = _loadFileOrNull("./sounds/miss.mp3");
      levelBuffer = _loadFileOrNull("./sounds/level.mp3");
    }
  };

  // Takes a function that returns a buffer rather than a buffer so that the
  // buffer is read *after* `initialize` has had a chance to populate it. The
  // buffers are undefined until the first call, so reading one eagerly at the
  // call site would silently play nothing on the very first sound.
  async function _playTrack(getAudioBuffer, loop = false) {
    initialize();

    const [, buffer] = await Promise.all([audioCTX.resume(), getAudioBuffer()]);

    if (!buffer) return null;

    const trackSource = new AudioBufferSourceNode(audioCTX, {
      buffer: buffer,
      loop: loop,
    });
    trackSource.connect(audioCTX.destination);
    trackSource.start();

    return trackSource;
  }

  const playRandomPluck = () => {
    const pluckIndex = Math.floor(Math.random() * numberOfPlucks);
    _playTrack(() => pluckBuffers[pluckIndex]);
  };

  const playMiss = () => {
    _playTrack(() => missBuffer);
  };

  const playLevel = () => {
    _playTrack(() => levelBuffer);
  };

  return {
    initialize,
    playRandomPluck,
    playMiss,
    playLevel,
  };
};
