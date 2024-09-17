export const makeAudioManager = () => {
  let hasInitialized = false;
  let audioCTX;
  let pluck1Buffer;
  let pluck2Buffer;
  let pluck3Buffer;
  let pluck4Buffer;
  let pluck5Buffer;
  let pluck6Buffer;
  let pluck7Buffer;
  let pluck8Buffer;
  let pluck9Buffer;
  let missBuffer;
  let levelBuffer;
  let silenceAudio;

  async function _loadFile(context, filePath) {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

  const initialize = () => {
    if (!hasInitialized) {
      hasInitialized = true;

      // Play silence in a loop in the background on instantiation. Playing some
      // audio continuously with the HTML audio API will allow audio via the Web
      // Audio API to play on the main sound channel in iOS, rather than the
      // ringer channel.
      silenceAudio = new Audio("./sounds/silence.mp3");
      silenceAudio.loop = true;
      silenceAudio.play();

      audioCTX = new AudioContext();
      pluck1Buffer = _loadFile(audioCTX, "./sounds/pluck1.mp3");
      pluck2Buffer = _loadFile(audioCTX, "./sounds/pluck2.mp3");
      pluck3Buffer = _loadFile(audioCTX, "./sounds/pluck3.mp3");
      pluck4Buffer = _loadFile(audioCTX, "./sounds/pluck4.mp3");
      pluck5Buffer = _loadFile(audioCTX, "./sounds/pluck5.mp3");
      pluck6Buffer = _loadFile(audioCTX, "./sounds/pluck6.mp3");
      pluck7Buffer = _loadFile(audioCTX, "./sounds/pluck7.mp3");
      pluck8Buffer = _loadFile(audioCTX, "./sounds/pluck8.mp3");
      pluck9Buffer = _loadFile(audioCTX, "./sounds/pluck9.mp3");
      missBuffer = _loadFile(audioCTX, "./sounds/miss.mp3");
      levelBuffer = _loadFile(audioCTX, "./sounds/level.mp3");
    }
  };

  async function _playTrack(audioBuffer, loop = true) {
    const playBuffer = (buffer) => {
      const trackSource = new AudioBufferSourceNode(audioCTX, {
        buffer: buffer,
        loop: loop,
      });
      trackSource.connect(audioCTX.destination);
      trackSource.start();
      return trackSource;
    };

    if (hasInitialized) {
      return Promise.all([audioCTX.resume(), audioBuffer]).then((e) =>
        playBuffer(e[1])
      );
    } else {
      return Promise.all([initialize(), audioBuffer]).then((e) =>
        playBuffer(e[1])
      );
    }
  }

  const playRandomPluck = () => {
    _playTrack(
      [
        pluck1Buffer,
        pluck2Buffer,
        pluck3Buffer,
        pluck4Buffer,
        pluck5Buffer,
        pluck6Buffer,
        pluck7Buffer,
        pluck8Buffer,
        pluck9Buffer,
      ][Math.floor(Math.random() * 9)],
      false
    );
  };

  const playMiss = () => {
    _playTrack(missBuffer, false);
  };

  const playLevel = () => {
    _playTrack(levelBuffer, false);
  };

  return {
    initialize,
    playRandomPluck,
    playMiss,
    playLevel,
  };
};
